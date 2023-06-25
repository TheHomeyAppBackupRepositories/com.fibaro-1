'use strict';

const Homey = require('homey');

class FibaroRollerShutter3Driver extends Homey.Driver {

  onInit() {
    super.onInit();

    this.homey.flow.getDeviceTriggerCard('FGR-223-switch-1')
      .registerRunListener((args, state) => {
        return state.scene === args.scene;
      });

    this.homey.flow.getDeviceTriggerCard('FGR-223-switch-2')
      .registerRunListener((args, state) => {
        return state.scene === args.scene;
      });

    this.homey.flow.getActionCard('FGR-223_set_tilt')
      .registerRunListener((args, state) => {
        return args.device.setTiltPositionListener(args, state);
      });
  }

}

module.exports = FibaroRollerShutter3Driver;
