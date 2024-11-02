#!/usr/bin/env python3
import serial
import time
import argparse
import math
from enum import IntEnum


def rad2deg(rad):
    return rad * 180.0 / math.pi


def deg2rad(deg):
    return deg * math.pi / 180.0


CRSF_SYNC = 0xC8
STICK_MINIMUM = 0  # 885
STICK_MAXIMUM = 100  # 2115
STICK_CENTER = int((STICK_MINIMUM + STICK_MAXIMUM) / 2)


class PacketsTypes(IntEnum):
    GPS = 0x02
    VARIO = 0x07
    BATTERY_SENSOR = 0x08
    BARO_ALT = 0x09
    HEARTBEAT = 0x0B
    VIDEO_TRANSMITTER = 0x0F
    LINK_STATISTICS = 0x14
    RC_CHANNELS_PACKED = 0x16
    ATTITUDE = 0x1E
    FLIGHT_MODE = 0x21
    DEVICE_INFO = 0x29
    CONFIG_READ = 0x2C
    CONFIG_WRITE = 0x2D
    RADIO_ID = 0x3A
    COMMAND = 0x32  # Added for sending commands


def crc8_dvb_s2(crc, a) -> int:
    crc = crc ^ a
    for ii in range(8):
        if crc & 0x80:
            crc = (crc << 1) ^ 0xD5
        else:
            crc = crc << 1
    return crc & 0xFF


def crc8_data(data) -> int:
    crc = 0
    for a in data:
        crc = crc8_dvb_s2(crc, a)
    return crc


def crsf_validate_frame(frame) -> bool:
    return crc8_data(frame[2:-1]) == frame[-1]


def signed_byte(b):
    return b - 256 if b >= 128 else b


def handleCrsfPacket(ptype, data):
    if ptype == PacketsTypes.GPS:
        lat = int.from_bytes(data[3:7], byteorder="big", signed=True) / 1e7
        lon = int.from_bytes(data[7:11], byteorder="big", signed=True) / 1e7
        gspd = int.from_bytes(data[11:13], byteorder="big", signed=True) / 36.0
        hdg = int.from_bytes(data[13:15], byteorder="big", signed=True) / 100.0
        alt = int.from_bytes(data[15:17], byteorder="big", signed=True) - 1000
        sats = data[17]
        print(
            '{"type": "GPS", "latitude": %f, "longitude": %f, "groundSpeed": %.1f, "heading": %.1f, "altitude": %d, "satellites": %d}'
            % (lat, lon, gspd, hdg, alt, sats)
        )
    elif ptype == PacketsTypes.VARIO:
        vspd = int.from_bytes(data[3:5], byteorder="big", signed=True) / 10.0
        print('{"type": "VARIO", "verticalSpeed": %.1f}' % vspd)
    elif ptype == PacketsTypes.ATTITUDE:
        pitch = int.from_bytes(data[3:5], byteorder="big", signed=True) / 10000.0
        roll = int.from_bytes(data[5:7], byteorder="big", signed=True) / 10000.0
        yaw = int.from_bytes(data[7:9], byteorder="big", signed=True) / 10000.0
        print(
            '{"type": "ATTITUDE", "pitch": %.2f, "roll": %.2f, "yaw": %.2f}'
            % (pitch, roll, yaw)
        )
    elif ptype == PacketsTypes.BARO_ALT:
        alt = int.from_bytes(data[3:7], byteorder="big", signed=True) / 100.0
        print('{"type": "BARO_ALTITUDE", "altitude": %.2f}' % alt)
    elif ptype == PacketsTypes.LINK_STATISTICS:
        rssi1 = signed_byte(data[3])
        rssi2 = signed_byte(data[4])
        lq = data[5]
        snr = signed_byte(data[6])
        print(
            '{"type": "LINK_STATISTICS", "rssi1": %d, "rssi2": %d, "linkQuality": %d, "snr": %d}'
            % (rssi1, rssi2, lq, snr)
        )
    elif ptype == PacketsTypes.BATTERY_SENSOR:
        vbat = int.from_bytes(data[3:5], byteorder="big", signed=True) / 10.0
        curr = int.from_bytes(data[5:7], byteorder="big", signed=True) / 10.0
        mah = data[7] << 16 | data[8] << 7 | data[9]
        pct = data[10]
        print(
            '{"type": "BATTERY", "voltage": %.2f, "current": %.1f, "mah": %d, "percentage": %d}'
            % (vbat, curr, mah, pct)
        )


parser = argparse.ArgumentParser()
parser.add_argument(
    "-P",
    "--port",
    default="/dev/serial0",
    required=False,
    help="Serial port to read from",
)
parser.add_argument(
    "-b", "--baud", default=420000, required=False, help="Baud rate for the serial port"
)
parser.add_argument(
    "-i",
    "--interval",
    type=float,
    default=1.0,
    required=False,
    help="Interval between attitude commands (seconds)",
)
args = parser.parse_args()

# ----------------------------------

# CRSF Protocol Constants
CRSF_SYNC_BYTE = 0xC8
CRSF_FRAMETYPE_RC_CHANNELS = 0x16


class RCChannels(IntEnum):
    ROLL = 0  # A
    PITCH = 1  # E
    THROTTLE = 2  # T
    YAW = 3  # R
    AUX1 = 4  # TODO: perhaps use for servo motor
    AUX2 = 5
    AUX3 = 6
    AUX4 = 7
    AUX5 = 8
    AUX6 = 9
    AUX7 = 10
    AUX8 = 11
    AUX9 = 12
    AUX10 = 13
    AUX11 = 14
    AUX12 = 15


class TestCRSFController:
    def __init__(self, uart):
        self.uart = uart
        # Initialize channels to middle position (STICK_CENTER) except throttle (885)
        self.channel_values = [STICK_CENTER] * 16
        self.channel_values[RCChannels.THROTTLE] = (
            STICK_MINIMUM  # Throttle starts at lowest position
        )

    def calculate_crc8(self, data):
        """Calculate CRSF CRC8 DVB-S2 checksum"""
        crc = 0
        for byte in data:
            crc ^= byte
            for _ in range(8):
                if crc & 0x80:
                    crc = (crc << 1) ^ 0xD5
                else:
                    crc = crc << 1
            crc &= 0xFF
        return crc

    def convert_to_rc_value(self, value):
        """Convert input value (885-2115) to RC channel value (172-1811)"""
        # CRSF protocol uses 172-1811 range for RC channels
        # return int(((value - 885) * (1811 - 172) / (2115 - 885)) + 172)
        crsf_min = 7  # should be 172 but 7 works better for some reason
        crsf_max = 1976  # 1811
        return int(
            crsf_min
            + (crsf_max - crsf_min)
            * ((value - STICK_MINIMUM) / (STICK_MAXIMUM - STICK_MINIMUM))
        )
        # 991 -> 1500 (center)

    def pack_channels(self):
        """Pack 16 channels into CRSF RC channels packet format"""
        packet = bytearray()
        converted_values = [self.convert_to_rc_value(v) for v in self.channel_values]

        # Pack 16 channels into 11-bit values
        packed_channels = 0
        bit_index = 0

        for value in converted_values:
            packed_channels |= value << bit_index
            bit_index += 11

            while bit_index >= 8:
                packet.append(packed_channels & 0xFF)
                packed_channels >>= 8
                bit_index -= 8

        if bit_index > 0:
            packet.append(packed_channels & 0xFF)

        return packet[:22]  # CRSF RC packet is always 22 bytes

    def create_crsf_frame(self, payload):
        """Create a complete CRSF frame with header and CRC"""
        frame_length = len(payload) + 2  # +2 for type and CRC

        frame = bytearray([CRSF_SYNC_BYTE, frame_length, CRSF_FRAMETYPE_RC_CHANNELS])

        frame.extend(payload)
        frame.append(self.calculate_crc8(frame[2:]))
        return frame

    def set_channel(self, channel, value):
        """Set specific channel value (885-2115 range)"""
        if STICK_MINIMUM <= value <= STICK_MAXIMUM:
            self.channel_values[channel] = value
        else:
            raise ValueError(
                f"Channel value must be between {STICK_MINIMUM} and {STICK_MAXIMUM}"
            )

    def send_channels(self):
        """Send current channel values as CRSF packet"""
        payload = self.pack_channels()
        frame = self.create_crsf_frame(payload)
        self.uart.write(frame)
        return frame


with serial.Serial(args.port, args.baud, timeout=2) as uart:
    input_buffer = bytearray()
    # last_command_time = 0

    # controller = TestCRSFController(uart)

    try:
        while True:
            # Handle incoming data
            if uart.in_waiting > 0:
                input_buffer.extend(uart.read(uart.in_waiting))
            else:
                time.sleep(0.010)

            # Process received packets
            if len(input_buffer) > 2:
                expected_len = input_buffer[1] + 2
                if expected_len > 64 or expected_len < 4:
                    input_buffer = []
                elif len(input_buffer) >= expected_len:
                    single_packet = input_buffer[:expected_len]
                    input_buffer = input_buffer[expected_len:]

                    if not crsf_validate_frame(single_packet):
                        PACKET_BYTES = " ".join(map(hex, single_packet))
                        print(f"CRC error: {PACKET_BYTES}")
                    else:
                        handleCrsfPacket(single_packet[2], single_packet)

            # Send random attitude commands at specified interval
            # current_time = time.time()
            # if current_time - last_command_time >= args.interval:
            #     # for _ in range(100):
            #     for stick_value in range(STICK_MINIMUM, STICK_MAXIMUM, 1):
            #         controller.set_channel(RCChannels.THROTTLE, stick_value)
            #         frame = controller.send_channels()
            #         print(f"Set stick value: {stick_value}") ## TODO: remove

            #         time.sleep(1.0/400.0)  # CRSF runs at 400Hz

            #     controller.set_channel(RCChannels.YAW, STICK_CENTER)

            #     last_command_time = current_time
    except KeyboardInterrupt:
        print("\nStopping transmission...")
    finally:
        uart.close()
        print("UART connection closed")
