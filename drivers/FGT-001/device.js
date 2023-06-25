'use strict';

const { ZwaveDevice } = require('homey-zwavedriver');

// TODO: Make the MultiChannel node 2 (optional bluetooth temperature sensor) report the temperature, currently not possible since the device doesn't report the MultiChannel node unless you change a setting.
// TODO: set battery type in driver.compose.json
class RadiatorThermostat extends ZwaveDevice {

  onNodeInit() {
    this.registerCapability('measure_battery', 'BATTERY', {
      getOpts: {
        pollInterval: 'poll_interval_battery',
        pollMultiplication: 1000,
      },
    });
    this.registerCapability('measure_temperature', 'SENSOR_MULTILEVEL', {
      getOpts: {
        pollInterval: 'poll_interval_measure_temperature',
        pollMultiplication: 1000,
      },
      reportParser: report => {
        if (report['Sensor Type'] !== 'Temperature (version 1)') return null;
        return report['Sensor Value (Parsed)'];
      },
      reportParserOverride: true,
    });
    this.registerCapability('target_temperature', 'THERMOSTAT_SETPOINT', {
      getOpts: {
        pollInterval: 'poll_interval_target_temperature',
        pollMultiplication: 1000,
      },
    });
  }

}

module.exports = RadiatorThermostat;
