// SPDX-License-Identifier: AGPL-3.0-or-later

use windows::Win32::Graphics::Direct3D11::{
    D3D11_BIND_RENDER_TARGET, D3D11_CPU_ACCESS_READ, D3D11_MAP_READ, D3D11_MAPPED_SUBRESOURCE,
    D3D11_RESOURCE_MISC_SHARED, D3D11_TEXTURE2D_DESC, D3D11_USAGE_DEFAULT, D3D11_USAGE_STAGING,
    D3D11_VIDEO_FRAME_FORMAT_PROGRESSIVE, D3D11_VIDEO_PROCESSOR_CONTENT_DESC,
    D3D11_VIDEO_PROCESSOR_INPUT_VIEW_DESC, D3D11_VIDEO_PROCESSOR_INPUT_VIEW_DESC_0,
    D3D11_VIDEO_PROCESSOR_OUTPUT_VIEW_DESC, D3D11_VIDEO_PROCESSOR_OUTPUT_VIEW_DESC_0,
    D3D11_VIDEO_PROCESSOR_STREAM, D3D11_VIDEO_USAGE_PLAYBACK_NORMAL,
    D3D11_VPIV_DIMENSION_TEXTURE2D, D3D11_VPOV_DIMENSION_TEXTURE2D, ID3D11Device,
    ID3D11DeviceContext, ID3D11Resource, ID3D11Texture2D, ID3D11VideoContext, ID3D11VideoContext1,
    ID3D11VideoDevice, ID3D11VideoProcessor, ID3D11VideoProcessorEnumerator,
    ID3D11VideoProcessorInputView, ID3D11VideoProcessorOutputView,
};
use windows::Win32::Graphics::Dxgi::Common::{
    DXGI_COLOR_SPACE_RGB_FULL_G10_NONE_P709, DXGI_COLOR_SPACE_RGB_FULL_G22_NONE_P709,
    DXGI_COLOR_SPACE_RGB_FULL_G2084_NONE_P2020, DXGI_COLOR_SPACE_TYPE,
    DXGI_COLOR_SPACE_YCBCR_STUDIO_G22_LEFT_P709, DXGI_FORMAT_NV12, DXGI_RATIONAL, DXGI_SAMPLE_DESC,
};
use windows::Win32::Graphics::Dxgi::IDXGIResource;
use windows::core::Interface;

use crate::hdr;

fn vlog(msg: &str) {
    if crate::game_capture_abi::env_flag_enabled(crate::game_capture_abi::ENV_VERBOSE) {
        use std::io::Write;
        let _ = writeln!(std::io::stderr(), "[fluxer-nv12] {msg}");
    }
}

pub const NV12_OUTPUT_SLOT_COUNT: usize = 3;

struct Nv12OutputSlot {
    texture: ID3D11Texture2D,
    staging: ID3D11Texture2D,
    view: ID3D11VideoProcessorOutputView,
    handle: u64,
}

pub struct Nv12GpuConverter {
    _video_device: ID3D11VideoDevice,
    video_context: ID3D11VideoContext,
    processor: ID3D11VideoProcessor,
    _enumerator: ID3D11VideoProcessorEnumerator,
    input_view: ID3D11VideoProcessorInputView,
    output_slots: [Nv12OutputSlot; NV12_OUTPUT_SLOT_COUNT],
    slot_cursor: usize,
    context: ID3D11DeviceContext,
    out_width: u32,
    out_height: u32,
}

pub struct Nv12SharedTextureFrame {
    pub handle: u64,
    pub width: u32,
    pub height: u32,
    pub dxgi_format: u32,
    slot_index: usize,
}

impl Nv12GpuConverter {
    #[allow(clippy::too_many_arguments)]
    pub fn new(
        device: &ID3D11Device,
        context: &ID3D11DeviceContext,
        input: &ID3D11Texture2D,
        in_width: u32,
        in_height: u32,
        out_width: u32,
        out_height: u32,
        source_format: hdr::SourceFormat,
    ) -> Option<Self> {
        let out_width = (out_width & !1).max(2);
        let out_height = (out_height & !1).max(2);
        let video_device = device
            .cast::<ID3D11VideoDevice>()
            .inspect_err(|e| vlog(&format!("cast ID3D11VideoDevice failed: {e:?}")))
            .ok()?;
        let video_context = context
            .cast::<ID3D11VideoContext>()
            .inspect_err(|e| vlog(&format!("cast ID3D11VideoContext failed: {e:?}")))
            .ok()?;

        let content_desc = D3D11_VIDEO_PROCESSOR_CONTENT_DESC {
            InputFrameFormat: D3D11_VIDEO_FRAME_FORMAT_PROGRESSIVE,
            InputFrameRate: DXGI_RATIONAL {
                Numerator: 60,
                Denominator: 1,
            },
            InputWidth: in_width,
            InputHeight: in_height,
            OutputFrameRate: DXGI_RATIONAL {
                Numerator: 60,
                Denominator: 1,
            },
            OutputWidth: out_width,
            OutputHeight: out_height,
            Usage: D3D11_VIDEO_USAGE_PLAYBACK_NORMAL,
        };
        let enumerator = unsafe { video_device.CreateVideoProcessorEnumerator(&content_desc) }
            .inspect_err(|e| vlog(&format!("CreateVideoProcessorEnumerator: {e:?}")))
            .ok()?;
        let processor = unsafe { video_device.CreateVideoProcessor(&enumerator, 0) }
            .inspect_err(|e| vlog(&format!("CreateVideoProcessor: {e:?}")))
            .ok()?;

        if let Ok(vctx1) = video_context.cast::<ID3D11VideoContext1>() {
            let input_cs = input_colour_space(source_format);
            unsafe {
                vctx1.VideoProcessorSetStreamColorSpace1(&processor, 0, input_cs);
                vctx1.VideoProcessorSetOutputColorSpace1(
                    &processor,
                    DXGI_COLOR_SPACE_YCBCR_STUDIO_G22_LEFT_P709,
                );
            }
            vlog(&format!(
                "video processor colour space set: input={} -> output=YCbCr studio Rec.709",
                input_cs.0
            ));
        } else {
            vlog("ID3D11VideoContext1 unavailable; using default SDR Rec.709 colour space");
        }

        let output_desc = D3D11_TEXTURE2D_DESC {
            Width: out_width,
            Height: out_height,
            MipLevels: 1,
            ArraySize: 1,
            Format: DXGI_FORMAT_NV12,
            SampleDesc: DXGI_SAMPLE_DESC {
                Count: 1,
                Quality: 0,
            },
            Usage: D3D11_USAGE_DEFAULT,
            BindFlags: D3D11_BIND_RENDER_TARGET.0 as u32,
            CPUAccessFlags: 0,
            MiscFlags: D3D11_RESOURCE_MISC_SHARED.0 as u32,
        };
        let mut output_slots = Vec::with_capacity(NV12_OUTPUT_SLOT_COUNT);
        for _ in 0..NV12_OUTPUT_SLOT_COUNT {
            output_slots.push(create_output_slot(
                device,
                &video_device,
                &enumerator,
                &output_desc,
            )?);
        }
        assert_eq!(
            output_slots.len(),
            NV12_OUTPUT_SLOT_COUNT,
            "all NV12 output slots created"
        );
        let Ok(output_slots) = <[Nv12OutputSlot; NV12_OUTPUT_SLOT_COUNT]>::try_from(output_slots)
        else {
            vlog("NV12 output slot count mismatch");
            return None;
        };

        let input_view_desc = D3D11_VIDEO_PROCESSOR_INPUT_VIEW_DESC {
            FourCC: 0,
            ViewDimension: D3D11_VPIV_DIMENSION_TEXTURE2D,
            Anonymous: D3D11_VIDEO_PROCESSOR_INPUT_VIEW_DESC_0 {
                Texture2D: windows::Win32::Graphics::Direct3D11::D3D11_TEX2D_VPIV {
                    MipSlice: 0,
                    ArraySlice: 0,
                },
            },
        };
        let mut input_view = None;
        unsafe {
            video_device.CreateVideoProcessorInputView(
                input,
                &enumerator,
                &input_view_desc,
                Some(&mut input_view),
            )
        }
        .inspect_err(|e| vlog(&format!("CreateVideoProcessorInputView: {e:?}")))
        .ok()?;
        let input_view = input_view?;
        vlog(&format!(
            "NV12 converter built OK ({in_width}x{in_height} -> {out_width}x{out_height})"
        ));

        Some(Self {
            _video_device: video_device,
            video_context,
            processor,
            _enumerator: enumerator,
            input_view,
            output_slots,
            slot_cursor: 0,
            context: context.clone(),
            out_width,
            out_height,
        })
    }

    pub fn dxgi_format(&self) -> u32 {
        DXGI_FORMAT_NV12.0 as u32
    }

    pub fn convert_shared_texture(&mut self) -> Result<Nv12SharedTextureFrame, String> {
        assert!(
            self.slot_cursor < NV12_OUTPUT_SLOT_COUNT,
            "slot cursor in range"
        );
        assert!(self.out_width >= 2, "output width at least 2");
        let slot_index = self.slot_cursor;
        self.slot_cursor = (slot_index + 1) % NV12_OUTPUT_SLOT_COUNT;
        self.run_video_processor(slot_index)?;
        unsafe {
            self.context.Flush();
        }
        Ok(Nv12SharedTextureFrame {
            handle: self.output_slots[slot_index].handle,
            width: self.out_width,
            height: self.out_height,
            dxgi_format: self.dxgi_format(),
            slot_index,
        })
    }

    pub fn readback_nv12(
        &self,
        frame: &Nv12SharedTextureFrame,
    ) -> Result<(Vec<u8>, u32, u32), String> {
        if frame.width != self.out_width || frame.height != self.out_height {
            return Err("NV12 readback frame dimensions do not match converter output".into());
        }
        let slot = self
            .output_slots
            .get(frame.slot_index)
            .ok_or_else(|| "NV12 readback slot index out of range".to_string())?;
        let source: ID3D11Resource = slot
            .texture
            .cast()
            .map_err(|e| format!("NV12 source resource cast: {e}"))?;
        let staging: ID3D11Resource = slot
            .staging
            .cast()
            .map_err(|e| format!("NV12 staging resource cast: {e}"))?;
        unsafe {
            self.context.CopyResource(&staging, &source);
        }
        let mut mapped = D3D11_MAPPED_SUBRESOURCE::default();
        unsafe {
            self.context
                .Map(&staging, 0, D3D11_MAP_READ, 0, Some(&mut mapped))
                .map_err(|e| format!("Map NV12 staging texture: {e}"))?;
        }
        let result = copy_mapped_nv12_tight(&mapped, frame.width, frame.height);
        unsafe {
            self.context.Unmap(&staging, 0);
        }
        result
    }

    fn run_video_processor(&self, slot_index: usize) -> Result<(), String> {
        assert!(slot_index < NV12_OUTPUT_SLOT_COUNT, "slot index in range");
        let mut stream = D3D11_VIDEO_PROCESSOR_STREAM {
            Enable: windows::core::BOOL(1),
            OutputIndex: 0,
            InputFrameOrField: 0,
            PastFrames: 0,
            FutureFrames: 0,
            ppPastSurfaces: std::ptr::null_mut(),
            pInputSurface: std::mem::ManuallyDrop::new(Some(self.input_view.clone())),
            ppFutureSurfaces: std::ptr::null_mut(),
            ppPastSurfacesRight: std::ptr::null_mut(),
            pInputSurfaceRight: std::mem::ManuallyDrop::new(None),
            ppFutureSurfacesRight: std::ptr::null_mut(),
        };
        let blt = unsafe {
            self.video_context.VideoProcessorBlt(
                &self.processor,
                &self.output_slots[slot_index].view,
                0,
                std::slice::from_ref(&stream),
            )
        };
        unsafe {
            std::mem::ManuallyDrop::drop(&mut stream.pInputSurface);
        }
        blt.inspect_err(|e| vlog(&format!("VideoProcessorBlt RGB->NV12: {e:?}")))
            .map_err(|e| format!("VideoProcessorBlt RGB->NV12: {e}"))
    }
}

fn create_output_slot(
    device: &ID3D11Device,
    video_device: &ID3D11VideoDevice,
    enumerator: &ID3D11VideoProcessorEnumerator,
    output_desc: &D3D11_TEXTURE2D_DESC,
) -> Option<Nv12OutputSlot> {
    assert!(output_desc.Width >= 2, "output width at least 2");
    assert!(output_desc.Height >= 2, "output height at least 2");
    let mut output_texture = None;
    unsafe { device.CreateTexture2D(output_desc, None, Some(&mut output_texture)) }
        .inspect_err(|e| vlog(&format!("CreateTexture2D NV12 output: {e:?}")))
        .ok()?;
    let output_texture = output_texture?;
    let staging_desc = D3D11_TEXTURE2D_DESC {
        Width: output_desc.Width,
        Height: output_desc.Height,
        MipLevels: 1,
        ArraySize: 1,
        Format: DXGI_FORMAT_NV12,
        SampleDesc: DXGI_SAMPLE_DESC {
            Count: 1,
            Quality: 0,
        },
        Usage: D3D11_USAGE_STAGING,
        BindFlags: 0,
        CPUAccessFlags: D3D11_CPU_ACCESS_READ.0 as u32,
        MiscFlags: 0,
    };
    let mut staging = None;
    unsafe { device.CreateTexture2D(&staging_desc, None, Some(&mut staging)) }
        .inspect_err(|e| vlog(&format!("CreateTexture2D NV12 staging output: {e:?}")))
        .ok()?;
    let staging = staging?;
    let resource: IDXGIResource = output_texture
        .cast()
        .inspect_err(|e| {
            vlog(&format!(
                "QueryInterface IDXGIResource for NV12 output: {e:?}"
            ))
        })
        .ok()?;
    let shared_handle = unsafe { resource.GetSharedHandle() }
        .inspect_err(|e| vlog(&format!("GetSharedHandle NV12 output: {e:?}")))
        .ok()?;
    if shared_handle.is_invalid() {
        vlog("GetSharedHandle NV12 output returned an invalid handle");
        return None;
    }
    let shared_handle = shared_handle.0 as usize as u64;

    let output_view_desc = D3D11_VIDEO_PROCESSOR_OUTPUT_VIEW_DESC {
        ViewDimension: D3D11_VPOV_DIMENSION_TEXTURE2D,
        Anonymous: D3D11_VIDEO_PROCESSOR_OUTPUT_VIEW_DESC_0 {
            Texture2D: windows::Win32::Graphics::Direct3D11::D3D11_TEX2D_VPOV { MipSlice: 0 },
        },
    };
    let mut output_view = None;
    unsafe {
        video_device.CreateVideoProcessorOutputView(
            &output_texture,
            enumerator,
            &output_view_desc,
            Some(&mut output_view),
        )
    }
    .inspect_err(|e| vlog(&format!("CreateVideoProcessorOutputView: {e:?}")))
    .ok()?;
    let output_view = output_view?;

    Some(Nv12OutputSlot {
        texture: output_texture,
        staging,
        view: output_view,
        handle: shared_handle,
    })
}

fn copy_mapped_nv12_tight(
    mapped: &D3D11_MAPPED_SUBRESOURCE,
    width: u32,
    height: u32,
) -> Result<(Vec<u8>, u32, u32), String> {
    if width < 2 || height < 2 || !width.is_multiple_of(2) || !height.is_multiple_of(2) {
        return Err("NV12 readback requires positive even dimensions".into());
    }
    let row_bytes = width as usize;
    let row_pitch = mapped.RowPitch as usize;
    if mapped.pData.is_null() || row_pitch < row_bytes {
        return Err("NV12 staging texture returned an invalid mapped layout".into());
    }
    let y_len = row_bytes
        .checked_mul(height as usize)
        .ok_or_else(|| "NV12 luma readback length overflow".to_string())?;
    let uv_len = row_bytes
        .checked_mul((height / 2) as usize)
        .ok_or_else(|| "NV12 chroma readback length overflow".to_string())?;
    let mut data = vec![
        0u8;
        y_len
            .checked_add(uv_len)
            .ok_or_else(|| "NV12 readback length overflow".to_string())?
    ];
    let source = mapped.pData as *const u8;
    for row in 0..height as usize {
        unsafe {
            std::ptr::copy_nonoverlapping(
                source.add(row * row_pitch),
                data.as_mut_ptr().add(row * row_bytes),
                row_bytes,
            );
        }
    }
    let uv_source = unsafe { source.add(row_pitch * height as usize) };
    for row in 0..(height / 2) as usize {
        unsafe {
            std::ptr::copy_nonoverlapping(
                uv_source.add(row * row_pitch),
                data.as_mut_ptr().add(y_len + row * row_bytes),
                row_bytes,
            );
        }
    }
    Ok((data, width, width))
}

fn input_colour_space(source_format: hdr::SourceFormat) -> DXGI_COLOR_SPACE_TYPE {
    match source_format {
        hdr::SourceFormat::R10G10B10A2 { hdr: true } => DXGI_COLOR_SPACE_RGB_FULL_G2084_NONE_P2020,
        hdr::SourceFormat::Rgba16Float { hdr: true } => DXGI_COLOR_SPACE_RGB_FULL_G10_NONE_P709,
        _ => DXGI_COLOR_SPACE_RGB_FULL_G22_NONE_P709,
    }
}

unsafe impl Send for Nv12GpuConverter {}

#[cfg(test)]
mod tests {
    use super::*;

    fn cs_value(source_format: hdr::SourceFormat) -> i32 {
        input_colour_space(source_format).0
    }

    #[test]
    fn eight_bit_sources_use_sdr_rec709_colour_space() {
        assert_eq!(
            cs_value(hdr::SourceFormat::Bgra8),
            DXGI_COLOR_SPACE_RGB_FULL_G22_NONE_P709.0
        );
        assert_eq!(
            cs_value(hdr::SourceFormat::Rgba8),
            DXGI_COLOR_SPACE_RGB_FULL_G22_NONE_P709.0
        );
    }

    #[test]
    fn unflagged_high_precision_sources_stay_sdr_rec709() {
        assert_eq!(
            cs_value(hdr::SourceFormat::R10G10B10A2 { hdr: false }),
            DXGI_COLOR_SPACE_RGB_FULL_G22_NONE_P709.0
        );
        assert_eq!(
            cs_value(hdr::SourceFormat::Rgba16Float { hdr: false }),
            DXGI_COLOR_SPACE_RGB_FULL_G22_NONE_P709.0
        );
    }

    #[test]
    fn ten_bit_hdr_uses_pq_rec2020_input_space() {
        assert_eq!(
            cs_value(hdr::SourceFormat::R10G10B10A2 { hdr: true }),
            DXGI_COLOR_SPACE_RGB_FULL_G2084_NONE_P2020.0
        );
    }

    #[test]
    fn fp16_hdr_uses_linear_extended_rec709_input_space() {
        assert_eq!(
            cs_value(hdr::SourceFormat::Rgba16Float { hdr: true }),
            DXGI_COLOR_SPACE_RGB_FULL_G10_NONE_P709.0
        );
    }

    #[test]
    fn nv12_readback_strips_gpu_row_pitch_padding_from_both_planes() {
        let mut mapped_bytes: Vec<u8> = vec![
            1, 2, 3, 4, 90, 91, 5, 6, 7, 8, 92, 93, 20, 21, 22, 23, 94, 95,
        ];
        let mapped = D3D11_MAPPED_SUBRESOURCE {
            pData: mapped_bytes.as_mut_ptr().cast(),
            RowPitch: 6,
            DepthPitch: 18,
        };
        let (data, stride_y, stride_uv) =
            copy_mapped_nv12_tight(&mapped, 4, 2).expect("copy padded NV12 planes");
        assert_eq!((stride_y, stride_uv), (4, 4));
        assert_eq!(data, vec![1, 2, 3, 4, 5, 6, 7, 8, 20, 21, 22, 23]);
    }
}
