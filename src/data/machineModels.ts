// Maps a MachineSpec id to a 3D model (GLB) that replaces the default box mesh.
// Machines without an entry here keep rendering as a colored box. Add a new
// model by dropping the .glb in src/model/ and registering its id below.

// Logistics
import loaderUrl from '../model/nutek_ntm0100_loader.glb?url';
import conveyorUrl from '../model/phone_line_conveyor_segment.glb?url';
// SMT
import laserMarkUrl from '../model/lansu_laser_marker.glb?url';
import printerUrl from '../model/stencil_printer_hp1200.glb?url';
import placerHsUrl from '../model/yamaha_ysm40r_pick_and_place_high_speed.glb?url';
import placerFineUrl from '../model/asmpt_siplace_sx_pick_and_place_fine_ic.glb?url';
import reflowUrl from '../model/heller_1936_mk7_reflow_oven.glb?url';
import coatingUrl from '../model/nordson_asymtek_sl1040.glb?url';
// Inspection
import spiUrl from '../model/koh_young_ky8080_zenith.glb?url';
import aoiUrl from '../model/omron_vt_s530_xray.glb?url'; // VT-S530 is an AOI despite the filename
import xrayUrl from '../model/nordson_matrix_xseries_axi.glb?url';
import qcUrl from '../model/keyence_vision_inspection.glb?url';
// Assembly
import ocaUrl from '../model/kunshan_honma_oca_laminator.glb?url';
import displayUrl from '../model/hanwha_smt_placement_machine.glb?url';
import cameraUrl from '../model/asmpt_amicra_c05_bonder.glb?url';
// Test
import ictProbeTestUrl from '../model/ict_probe_test_machine.glb?url';

export interface MachineModelDef {
  url: string;
  /**
   * Multiplier applied on top of the automatic footprint-fit scale (default 1).
   * Use >1 to enlarge models that look too small inside a tight footprint; this
   * is purely visual and does not affect the collision footprint.
   */
  scale?: number;
}

export const MODEL_BY_SPEC: Record<string, MachineModelDef> = {
  // Logistics
  loader: { url: loaderUrl, scale: 1.6 },
  conveyor: { url: conveyorUrl, scale: 1.6 },
  // SMT
  lasermark: { url: laserMarkUrl },
  printer: { url: printerUrl },
  'placer-hs': { url: placerHsUrl },
  'placer-fine': { url: placerFineUrl },
  reflow: { url: reflowUrl },
  coating: { url: coatingUrl },
  // Inspection
  spi: { url: spiUrl },
  aoi: { url: aoiUrl },
  xray: { url: xrayUrl },
  qc: { url: qcUrl },
  // Assembly
  oca: { url: ocaUrl },
  display: { url: displayUrl },
  camera: { url: cameraUrl },
  // Test
  ict: { url: ictProbeTestUrl },
};
