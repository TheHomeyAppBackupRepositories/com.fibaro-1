'use strict';

const { ZwaveDevice } = require('homey-zwavedriver');

class FibaroDimmerDevice extends ZwaveDevice {

  onNodeInit() {
    this.registerCapability('onoff', 'SWITCH_MULTILEVEL');
    this.registerCapability('dim', 'SWITCH_MULTILEVEL');

    this.registerReportListener('SCENE_ACTIVATION', 'SCENE_ACTIVATION_SET', report => {
      if (report.hasOwnProperty('Scene ID')) {
        const data = {
          scene: report['Scene ID'].toString(),
        };

        switch (this.getSetting('switch_type')) {
          case '0':
            this.homey.flow.getDeviceTriggerCard('FGD-211_momentary')
              .trigger(this, null, data)
              .catch(this.error);
            break;
          case '1':
            this.homey.flow.getDeviceTriggerCard('FGD-211_toggle')
              .trigger(this, null, data)
              .catch(this.error);
            break;
          case '2':
            this.homey.flow.getDeviceTriggerCard('FGD-211_roller')
              .trigger(this, null, data)
              .catch(this.error);
            break;
        }
      }
    });
  }

}

module.exports = FibaroDimmerDevice;
