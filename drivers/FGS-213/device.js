'use strict';

const { ZwaveDevice } = require('homey-zwavedriver');

class FibaroSingleSwitchTwoDevice extends ZwaveDevice {

  onNodeInit() {
    this.registerCapability('onoff', 'SWITCH_BINARY');
    this.registerCapability('measure_power', 'METER');
    this.registerCapability('meter_power', 'METER');

    this.registerSetting('53', value => {
      const kWh = Buffer.alloc(2);
      kWh.writeUIntBE([Math.round(value * 100)], 0, 2);
      return kWh;
    });

    this.registerReportListener('CENTRAL_SCENE', 'CENTRAL_SCENE_NOTIFICATION', report => {
      if (report.hasOwnProperty('Properties1')
        && report.Properties1.hasOwnProperty('Key Attributes')
        && report.hasOwnProperty('Scene Number')) {
        const state = {
          scene: report.Properties1['Key Attributes'],
        };

        if (report['Scene Number'] === 1) {
          this.homey.flow.getDeviceTriggerCard('FGS-213_S1')
            .trigger(this, null, state)
            .catch(this.error);
        } else if (report['Scene Number'] === 2) {
          this.homey.flow.getDeviceTriggerCard('FGS-213_S2')
            .trigger(this, null, state)
            .catch(this.error);
        }
      }
    });
  }

  async resetMeterRunListener(args, state) {
    if (this.node.CommandClass.COMMAND_CLASS_METER) {
      return this.node.CommandClass.COMMAND_CLASS_METER.METER_RESET({});
    }
    throw new Error('This device does not support meter resets');
  }

}

module.exports = FibaroSingleSwitchTwoDevice;
