'use strict';

const Homey = require('homey');

class FibaroDimmerTwoDeviceDriver extends Homey.Driver {

  onInit() {
    super.onInit();

    this.homey.flow.getDeviceTriggerCard('FGD-212_momentary')
      .registerRunListener((args, state) => {
        return state.scene === args.scene;
      });

    this.homey.flow.getDeviceTriggerCard('FGD-212_toggle')
      .registerRunListener((args, state) => {
        return state.scene === args.scene;
      });

    this.homey.flow.getDeviceTriggerCard('FGD-212_roller')
      .registerRunListener((args, state) => {
        return state.scene === args.scene;
      });

    this.homey.flow.getActionCard('FGD-212_set_brightness')
      .registerRunListener((args, state) => {
        return args.device.setBrightnessRunListener(args, state);
      });
    this.homey.flow.getActionCard('FGD-212_dim_duration')
      .registerRunListener((args, state) => {
        return args.device.dimDurationRunListener(args, state);
      });
    this.homey.flow.getActionCard('FGD-212_set_timer')
      .registerRunListener((args, state) => {
        return args.device.setTimerRunListener(args, state);
      });
    this.homey.flow.getActionCard('FGD-212_reset_meter')
      .registerRunListener((args, state) => {
        return args.device.resetMeterRunListener(args, state);
      });
  }

}

module.exports = FibaroDimmerTwoDeviceDriver;
