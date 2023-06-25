'use strict';

const Homey = require('homey');

class FibaroRGBWControllerDeviceDriver extends Homey.Driver {

  onInit() {
    super.onInit();

    this.homey.flow.getActionCard('RGBW_specific')
      .registerRunListener((args, state) => {
        return args.device.specificColorRunListener(args, state);
      });
    this.homey.flow.getActionCard('RGBW_animation')
      .registerRunListener((args, state) => {
        return args.device.animationRunListener(args, state);
      });

    this.homey.flow.getDeviceTriggerCard('RGBW_input_on').registerRunListener((args, state) => {
      return (args.input === state.input);
    });
    this.homey.flow.getDeviceTriggerCard('RGBW_input_off').registerRunListener((args, state) => {
      return (args.input === state.input);
    });
  }

}

module.exports = FibaroRGBWControllerDeviceDriver;
