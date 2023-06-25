'use strict';

const Homey = require('homey');

class FibaroWalliControllerDriver extends Homey.Driver {

  onInit() {
    super.onInit();

    this.homey.flow.getDeviceTriggerCard('FGWCEU-201-1_top_switch')
      .registerRunListener((args, state) => {
        return state.scene === args.scene;
      });

    this.homey.flow.getDeviceTriggerCard('FGWCEU-201-1_bottom_switch')
      .registerRunListener((args, state) => {
        return state.scene === args.scene;
      });
  }

}

module.exports = FibaroWalliControllerDriver;
