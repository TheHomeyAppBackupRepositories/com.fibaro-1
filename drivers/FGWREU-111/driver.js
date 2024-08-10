'use strict';

const Homey = require('homey');

class FibaroWalliWalliRollerShutter extends Homey.Driver {

  onInit() {
    super.onInit();

    this.homey.flow
      .getDeviceTriggerCard('FGWREU-111-top-switch')
      .registerRunListener((args, state) => {
        return state.scene === args.scene;
      });

    this.homey.flow
      .getDeviceTriggerCard('FGWREU-111-bottom-switch')
      .registerRunListener((args, state) => {
        return state.scene === args.scene;
      });

    this.homey.flow
      .getActionCard('FGWREU_set_tilt')
      .registerRunListener((args, state) => {
        return args.device.setTiltPositionListener(args, state);
      });
  }

}

module.exports = FibaroWalliWalliRollerShutter;
