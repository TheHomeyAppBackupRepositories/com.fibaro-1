'use strict';

const Homey = require('homey');

class FibaroRollerShutter24DeviceDriver extends Homey.Driver {

  onInit() {
    super.onInit();

    this.homey.flow.getDeviceTriggerCard('FGRM-222-momentary')
      .registerRunListener((args, state) => {
        return args.scene === state.scene;
      });
    this.homey.flow.getDeviceTriggerCard('FGRM-222-toggle')
      .registerRunListener((args, state) => {
        return args.scene === state.scene;
      });
    this.homey.flow.getDeviceTriggerCard('FGRM-222-momentary_single-gate_switch')
      .registerRunListener((args, state) => {
        return args.scene === state.scene;
      });

    this.homey.flow.getActionCard('FGRM-222_reset_meter')
      .registerRunListener((args, state) => {
        return args.device.resetMeterRunListener(args, state);
      });

    this.homey.flow.getActionCard('FGRM-222_set_tilt')
      .registerRunListener(args => {
        const { device, position } = args;
        return device.setTilt(position, () => device.getSetting('invertWindowCoveringsTiltDirection'));
      });
  }

}

module.exports = FibaroRollerShutter24DeviceDriver;
