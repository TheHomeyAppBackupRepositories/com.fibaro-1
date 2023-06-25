'use strict';

const { ZwaveDevice } = require('homey-zwavedriver');

const REQUEST_TIMEOUT = 1000 * 5; // 5 seconds;

class FibaroKeyfob extends ZwaveDevice {

  onNodeInit() {
    this.registerCapability('measure_battery', 'BATTERY');

    this.registerSetting('sequence_1', newValue => this.sequenceParser(newValue));
    this.registerSetting('sequence_2', newValue => this.sequenceParser(newValue));
    this.registerSetting('sequence_3', newValue => this.sequenceParser(newValue));
    this.registerSetting('sequence_4', newValue => this.sequenceParser(newValue));
    this.registerSetting('sequence_5', newValue => this.sequenceParser(newValue));
    this.registerSetting('sequence_6', newValue => this.sequenceParser(newValue));

    this.registerReportListener('CENTRAL_SCENE', 'CENTRAL_SCENE_NOTIFICATION', report => {
      if (report
        && report.hasOwnProperty('Scene Number')
        && report.hasOwnProperty('Properties1')
        && report.Properties1.hasOwnProperty('Key Attributes')) {
        if (report['Scene Number'] <= 6) {
          this.homey.flow.getDeviceTriggerCard('FGKF-601-scene')
            .trigger(this, null, {
              button: report['Scene Number'].toString(),
              scene: report.Properties1['Key Attributes'],
            })
            .catch(this.error);
        } else {
          this.homey.flow.getDeviceTriggerCard('FGKF-601-sequence')
            .trigger(this, null, { sequence: report['Scene Number'].toString() })
            .catch(this.error);
        }
      }
    });
  }

  async onSettings({ oldSettings, newSettings, changedKeys }) {
    /*
       If one setting changes for Lock Timeout or Sequence Timeout we need to handle them separately because
       we need to set the Protection CommandClass as well
     */

    if (changedKeys.includes('lock_timeout') || changedKeys.includes('sequence_lock')) {
      const lockObject = {
        lockTimeout: newSettings['lock_timeout'],
        sequenceLock: newSettings['sequence_lock'],
      };

      this._enableLockMode(lockObject)
        .catch(error => {
          this.error('Unable to set Protection mode, could be added to queue', error);
        });

      if (changedKeys.includes('lock_timeout')) {
        await this.configurationSet(
          {
            index: 2,
            size: 2,
          },
          newSettings['lock_timeout'],
        );
      }

      if (changedKeys.includes('sequence_lock')) {
        await this.configurationSet(
          {
            index: 1,
            size: 2,
            signed: false,
          },
          this.sequenceParser(newSettings['sequence_lock']),
        );
      }

      changedKeys = changedKeys.filter(changedKey => !['lock_timeout', 'sequence_lock'].includes(changedKey));
      return super.onSettings({ oldSettings, newSettings, changedKeys });
    }
    return super.onSettings({ oldSettings, newSettings, changedKeys });
  }

  customSaveMessage(oldSettings, newSettings, changedKeysArr) {
    return {
      en: 'To save the settings you need to wake up the Keyfob:\\n1: press O and -,\\n2: press the Δ button repeatedly until the LED is green;\\n3: press + to wake up.',
      nl: 'Om de instellingen op te slaan moet je de Keyfob wakker maken: \\n1: druk op O en -,\\n2: druk herhaaldelijk op de Δ knop totdat de LED groen is;\\n3: druk op + om wakker te maken.',
    };
  }

  async _enableLockMode(newValueObj) {
    if ((typeof newValueObj.lockTimeout === 'number'
        && newValueObj.lockTimeout > 0
        && this.getSetting('sequence_lock'))
      || (typeof newValueObj.sequenceLock === 'string'
        && this.getSetting('lock_timeout') > 0)) {
      await this.node.CommandClass.COMMAND_CLASS_PROTECTION.PROTECTION_SET({
        Level: {
          'Local Protection State': 1,
        },
        Level2: {
          'RF Protection State': 0,
        },
      });
    } else {
      await this.node.CommandClass.COMMAND_CLASS_PROTECTION.PROTECTION_SET({
        Level: {
          'Local Protection State': 0,
        },
        Level2: {
          'RF Protection State': 0,
        },
      });
    }
  }

  sequenceParser(sequence) {
    // if gesture is disabled return 0 as value
    if (sequence === 0) return Buffer.from([0, 0]);

    // split sequence into individual buttons
    const buttons = sequence.split(';').map(Number);

    // Parse the buttons to their corresponding value
    let parsing = buttons[0] + 8 * buttons[1];
    if (buttons[2]) parsing += 64 * buttons[2];
    if (buttons[3]) parsing += 512 * buttons[3];
    if (buttons[4]) parsing += 4096 * buttons[4];

    // return parsed buffer value
    const parsedSequence = Buffer.alloc(2);
    parsedSequence.writeUIntBE(parsing, 0, 2);
    return parsedSequence;
  }

}

module.exports = FibaroKeyfob;
