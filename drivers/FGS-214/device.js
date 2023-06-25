'use strict';

const { ZwaveDevice } = require('homey-zwavedriver');

class FibaroSmartModuleDevice extends ZwaveDevice {

  onNodeInit() {
    this.registerCapability('onoff', 'SWITCH_BINARY');

    this.registerReportListener('CENTRAL_SCENE', 'CENTRAL_SCENE_NOTIFICATION', report => {
      if (report.hasOwnProperty('Properties1')
        && report.Properties1.hasOwnProperty('Key Attributes')
        && report.hasOwnProperty('Scene Number')) {
        const state = {
          scene: report.Properties1['Key Attributes'],
        };

        if (report['Scene Number'] === 1) {
          this.homey.flow.getDeviceTriggerCard('FGS-214_S1')
            .trigger(this, null, state)
            .catch(this.error);
        } else if (report['Scene Number'] === 2) {
          this.homey.flow.getDeviceTriggerCard('FGS-214_S2')
            .trigger(this, null, state)
            .catch(this.error);
        }
      }
    });
  }

}

module.exports = FibaroSmartModuleDevice;
