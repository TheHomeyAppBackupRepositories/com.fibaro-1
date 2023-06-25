'use strict';

const Homey = require('homey');

class FibaroRGBW2Driver extends Homey.Driver {

  onInit() {
    super.onInit();

    this.homey.flow.getDeviceTriggerCard('input_on')
      .registerRunListener((args, state) => {
        return args.input === state.input.toString();
      });

    this.homey.flow.getDeviceTriggerCard('input_off')
      .registerRunListener((args, state) => {
        return args.input === state.input.toString();
      });

    this.homey.flow.getDeviceTriggerCard('FGRGBWM-442:scene')
      .registerRunListener((args, state) => {
        return args.input === state.input.toString() && args.scene === state.scene;
      });

    this.homey.flow.getActionCard('RGBW_animation_2')
      .registerRunListener((args, state) => {
        return args.device.animationRunListener(args, state);
      });

    this.homey.flow.getActionCard('RGBW_specific_2')
      .registerRunListener(args => {
        return args.device.specificColorRunListener(args);
      });
  }

}

module.exports = FibaroRGBW2Driver;
