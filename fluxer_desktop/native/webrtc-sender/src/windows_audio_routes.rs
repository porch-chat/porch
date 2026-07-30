// SPDX-License-Identifier: AGPL-3.0-or-later

use std::ffi::c_void;
use windows::Win32::Foundation::RPC_E_CHANGED_MODE;
use windows::Win32::Media::Audio::{
    EDataFlow, IMMDeviceEnumerator, MMDeviceEnumerator, eCapture, eCommunications, eConsole,
    eRender,
};
use windows::Win32::System::Com::{
    CLSCTX_ALL, COINIT_MULTITHREADED, CoCreateInstance, CoInitializeEx, CoTaskMemFree,
    CoUninitialize,
};

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum AudioFlow {
    Input,
    Output,
}

#[derive(Clone, Debug, Eq, PartialEq)]
pub struct AudioRouteIds {
    pub default: String,
    pub communications: String,
}

struct ComApartment {
    uninitialize: bool,
}

impl Drop for ComApartment {
    fn drop(&mut self) {
        if self.uninitialize {
            unsafe { CoUninitialize() };
        }
    }
}

fn initialize_com() -> Result<ComApartment, String> {
    let result = unsafe { CoInitializeEx(None, COINIT_MULTITHREADED) };
    if result.is_ok() {
        return Ok(ComApartment { uninitialize: true });
    }
    if result == RPC_E_CHANGED_MODE {
        return Ok(ComApartment {
            uninitialize: false,
        });
    }
    Err(format!(
        "CoInitializeEx failed with HRESULT 0x{:08x}",
        result.0 as u32
    ))
}

fn endpoint_id(
    enumerator: &IMMDeviceEnumerator,
    flow: EDataFlow,
    role: windows::Win32::Media::Audio::ERole,
) -> Result<String, String> {
    let device = unsafe { enumerator.GetDefaultAudioEndpoint(flow, role) }
        .map_err(|error| format!("GetDefaultAudioEndpoint failed: {error}"))?;
    let raw_id =
        unsafe { device.GetId() }.map_err(|error| format!("IMMDevice::GetId failed: {error}"))?;
    let result = unsafe { raw_id.to_string() }
        .map_err(|error| format!("audio endpoint ID was not valid UTF-16: {error}"));
    unsafe { CoTaskMemFree(Some(raw_id.0.cast::<c_void>())) };
    result
}

pub fn resolve_audio_route_ids(flow: AudioFlow) -> Result<AudioRouteIds, String> {
    let _apartment = initialize_com()?;
    let enumerator: IMMDeviceEnumerator = unsafe {
        CoCreateInstance(
            &MMDeviceEnumerator,
            None::<&windows::core::IUnknown>,
            CLSCTX_ALL,
        )
    }
    .map_err(|error| format!("CoCreateInstance(MMDeviceEnumerator) failed: {error}"))?;
    let data_flow = match flow {
        AudioFlow::Input => eCapture,
        AudioFlow::Output => eRender,
    };
    Ok(AudioRouteIds {
        default: endpoint_id(&enumerator, data_flow, eConsole)?,
        communications: endpoint_id(&enumerator, data_flow, eCommunications)?,
    })
}

#[cfg(test)]
mod tests {
    use super::{AudioFlow, resolve_audio_route_ids};

    #[test]
    #[ignore = "requires active Windows input and output endpoints"]
    fn resolves_live_windows_default_and_communications_routes() {
        for flow in [AudioFlow::Input, AudioFlow::Output] {
            let routes = resolve_audio_route_ids(flow).unwrap();
            assert!(!routes.default.trim().is_empty());
            assert!(!routes.communications.trim().is_empty());
            eprintln!("{flow:?}: {routes:?}");
        }
    }
}
