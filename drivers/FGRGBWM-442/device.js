'use strict';

const { ZwaveLightDevice, Util } = require('homey-zwavedriver');

const FACTORY_DEFAULT_COLOR_DURATION = 255;
const COLOR_TO_NODE = {
  r: 2,
  g: 3,
  b: 4,
  w: 5,
};

class FibaroRGBW2Device extends ZwaveLightDevice {

  async onNodeInit() {
    // Init for ZWave light device which handles RGBW
    await super.onNodeInit();

    this.onSwitchColorReport = this._onSwitchColorReport.bind(this);

    // Power capabilities
    this.registerCapability('meter_power', 'METER');
    this.registerCapability('measure_power', 'METER');

    // Input/ report
    this.registerCapability('measure_voltage.input1', 'SENSOR_MULTILEVEL', {
      multiChannelNodeId: 6,
      get: 'SENSOR_MULTILEVEL_GET',
      getOpts: {
        getOnStart: true,
      },
      report: 'SENSOR_MULTILEVEL_REPORT',
      reportParser: report => this._multiChannelAnalogInputParser(report, 6),
    });

    this.registerCapability('measure_voltage.input2', 'SENSOR_MULTILEVEL', {
      multiChannelNodeId: 7,
      get: 'SENSOR_MULTILEVEL_GET',
      getOpts: {
        getOnStart: true,
      },
      report: 'SENSOR_MULTILEVEL_REPORT',
      reportParser: report => this._multiChannelAnalogInputParser(report, 7),
    });

    this.registerCapability('measure_voltage.input3', 'SENSOR_MULTILEVEL', {
      multiChannelNodeId: 8,
      get: 'SENSOR_MULTILEVEL_GET',
      getOpts: {
        getOnStart: true,
      },
      report: 'SENSOR_MULTILEVEL_REPORT',
      reportParser: report => this._multiChannelAnalogInputParser(report, 8),
    });

    this.registerCapability('measure_voltage.input4', 'SENSOR_MULTILEVEL', {
      multiChannelNodeId: 9,
      get: 'SENSOR_MULTILEVEL_GET',
      getOpts: {
        getOnStart: true,
      },
      report: 'SENSOR_MULTILEVEL_REPORT',
      reportParser: report => this._multiChannelAnalogInputParser(report, 9),
    });

    this.registerReportListener('CENTRAL_SCENE', 'CENTRAL_SCENE_NOTIFICATION', report => {
      if (report
        && report.hasOwnProperty('Properties1')
        && report.hasOwnProperty('Scene Number')
        && report.Properties1.hasOwnProperty('Key Attributes')) {
        const input = report['Scene Number'];

        if (report.Properties1['Key Attributes'] === 'Key Held Down' || report.Properties1['Key Attributes'] === 'Key Pressed 1 time') {
          this.homey.flow.getDeviceTriggerCard('input_on')
            .trigger(this, null, { input }).catch(error => {
              this.log('Error: input_on', error);
            });
        }

        if (report.Properties1['Key Attributes'] === 'Key Released') {
          this.homey.flow.getDeviceTriggerCard('input_off')
            .trigger(this, null, { input })
            .catch(error => {
              this.log('Error: input_off', error);
            });
        }

        this.homey.flow.getDeviceTriggerCard('FGRGBWM-442:scene')
          .trigger(this, null, {
            input,
            scene: report.Properties1['Key Attributes'],
          })
          .catch(error => {
            this.log('Error: FGRGBWM-442:scene', error);
          });
      }
    });

    let isUpdating = false;
    this.registerReportListener('SWITCH_COLOR', 'SWITCH_COLOR_REPORT', async () => {
      if (isUpdating) return;
      isUpdating = true;
      await this._onSwitchColorReport();
      isUpdating = false;
    });

    setTimeout(this.onSwitchColorReport, 2500);
  }
  
  async _onSwitchColorReport() {
    this._currentRGBWValues().then(async (colors) => {
      const anyColorEnabled = [colors.red, colors.green, colors.blue].some(val => val > 0);
      const whiteEnabled = colors.white > 0;

      if (!anyColorEnabled && !whiteEnabled) {
        return this.setCapabilityValue('onoff', false).catch(this.error);
      }

      this.setCapabilityValue('onoff', true).catch(this.error);

      if (anyColorEnabled) {
        return this._setColorMode(colors).catch(this.error);
      } 
      
      this._setWhiteMode(colors.white / 255).catch(this.error);
    }).catch(this.error);
  }

  async _currentRGBWValues() {
    const red = await this.node.CommandClass.COMMAND_CLASS_SWITCH_COLOR.SWITCH_COLOR_GET({ 'Color Component ID': 0x02 }) || 0;
    const green = await this.node.CommandClass.COMMAND_CLASS_SWITCH_COLOR.SWITCH_COLOR_GET({ 'Color Component ID': 0x03 }) || 0;
    const blue = await this.node.CommandClass.COMMAND_CLASS_SWITCH_COLOR.SWITCH_COLOR_GET({ 'Color Component ID': 0x04 }) || 0;
    const white = await this.node.CommandClass.COMMAND_CLASS_SWITCH_COLOR.SWITCH_COLOR_GET({ 'Color Component ID': 0x00 }) || 0;

    return { red: red['Target Value'], green: green['Target Value'], blue: blue['Target Value'], white: white['Target Value'] };
  }

  async _setWhiteMode(brightness) {
    this.setCapabilityValue('light_temperature', 1);
    this.setCapabilityValue('dim', brightness);
    this.setCapabilityValue('light_mode', 'temperature');
  }

  async _setColorMode(color) {
    const hsv = Util.convertRGBToHSV(color);

    this.setCapabilityValue('light_hue', hsv.hue);
    this.setCapabilityValue('light_saturation', hsv.saturation);
    this.setCapabilityValue('dim', hsv.value);
    this.setCapabilityValue('light_mode', 'color');
  }

  _multiChannelAnalogInputParser(report, multiChannelNodeId) {
    const inputNumber = multiChannelNodeId - 5;
    const inputConfig = this.getSetting(`input_config_${inputNumber}`);

    if ((inputConfig === '0' || inputConfig === '1') && report.hasOwnProperty('Sensor Value (Parsed)')) {
      // Get voltage value from report and trigger the matching Flow
      const voltageValue = Number(report['Sensor Value (Parsed)']);

      this.homey.flow.getDeviceTriggerCard('analog_input')
        .trigger(
          this,
          { input: inputNumber },
          { volt: voltageValue },
        )
        .catch(this.error);

      return voltageValue;
    }
    return 0;
  }

  // Override _sendColor from base class to work with 4 colors rather then 5
  async _sendColors({
    warm, cold, red, green, blue, duration,
  }) {
    const SwitchColorVersion = this.getCommandClass('SWITCH_COLOR').version || 1;

    // Workaround the missing cold functionality by mixing blue as cold.
    if (cold > 0) {
      blue = Math.round((cold / 3) * 2);
      warm = Math.round((warm + 255 / 2));
    }
    let setCommand = {
      Properties1: {
        'Color Component Count': 4,
      },
      vg1: [
        {
          'Color Component ID': 0,
          Value: Math.round(warm),
        },
        {
          'Color Component ID': 2,
          Value: Math.round(red),
        },
        {
          'Color Component ID': 3,
          Value: Math.round(green),
        },
        {
          'Color Component ID': 4,
          Value: Math.round(blue),
        },
      ],
    };

    if (SwitchColorVersion === 3) {
      setCommand = Buffer.from([setCommand.Properties1['Color Component Count'], 0, setCommand.vg1[0].Value, 2, setCommand.vg1[1].Value, 3, setCommand.vg1[2].Value, 4, setCommand.vg1[3].Value], 255);
    } else if (SwitchColorVersion > 1) {
      setCommand.Duration = typeof duration !== 'number' ? FACTORY_DEFAULT_COLOR_DURATION : Util.calculateZwaveDimDuration(duration);
    }

    return this.node.CommandClass.COMMAND_CLASS_SWITCH_COLOR.SWITCH_COLOR_SET(setCommand);
  }

  async animationRunListener(args, state) {
    if (args && args.hasOwnProperty('animation')) {
      this.log('Setting animation to', args.animation);
      if (args.animation === '11') args.animation = Math.round(Math.random() * (10 - 6) + 6);

      try {
        return await this.configurationSet({
          index: 157,
          size: 1,
        }, Buffer.from([parseInt(args.animation, 10)]));
      } catch (err) {
        return Promise.reject(err);
      }
    }
  }

  async specificColorRunListener(args) {
    if (typeof args.color !== 'string' || typeof args.brightness !== 'number') {
      throw new Error('invalid_args');
    }

    if (!Object.keys(COLOR_TO_NODE).includes(args.color)) {
      throw new Error('invalid_args');
    }

    const colors = {};

    colors[args.color] = args.brightness * 2.55;

    return this.sendSpecificColors(colors);
  }

  /**
   * Function to send an object with color values to the correct multichannel node
   * The multichannel nodes are defined in the const COLOR_TO_NODE
   * @param {Object} colorObject Object with the RGBW color values to send, values in range 0-255.
   */
  async sendSpecificColors(colorObject) {
    if (!colorObject) return;

    // Set the new base for the report mutations
    this.reportRGBW = { ...colorObject };

    for (const color of Object.keys(colorObject)) {
      this.log(`Sending value: ${colorObject[color]} to ${color} node: ${COLOR_TO_NODE[color]}`);
      // Get the node matching with the color, then send the color value mapped to the 0-99 range
      await this.node.MultiChannelNodes[COLOR_TO_NODE[color]].CommandClass.COMMAND_CLASS_SWITCH_MULTILEVEL.SWITCH_MULTILEVEL_SET({
        Value: Math.round((colorObject[color] / 255) * 99),
        'Dimming Duration': 'Default',
      }).catch(e => this.error(e.message, e.stack));
    }
  }

}

module.exports = FibaroRGBW2Device;
