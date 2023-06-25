'use strict';

const Homey = require('homey');

class ButtonDriver extends Homey.Driver {

  onInit() {
    super.onInit();

    this.homey.flow.getDeviceTriggerCard('FGPB-101')
      .registerRunListener((args, state) => {
        return state.scene === args.scene;
      });
  }

}

module.exports = ButtonDriver;
