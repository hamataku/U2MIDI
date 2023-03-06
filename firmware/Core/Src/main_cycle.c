#include "main_cycle.h"

#include "usb_device.h"
#include "curemisc.h"
#include "curebuffer.h"
#include "usbd_midi_if.h"
#include "led.h"

static uint8_t note = 0;

typedef enum {
    NOTE_ON_COMMAND = 0,
    NOTE_ON_NOTE,
    NOTE_OFF_COMMAND,
    NOTE_OFF_NOTE,
    NO_COMMAND,
} MIDI_MESSAGE;

static MIDI_MESSAGE msg = NO_COMMAND;

void decode(uint8_t code)
{
    if (code & 0x80) {
        // status byte
        if ((code & 0xF0) == 0x90) {  // Note On
            msg = NOTE_ON_COMMAND;
        } else if ((code & 0xF0) == 0x80) {  // Note Off
            msg = NOTE_OFF_COMMAND;
        } else {
            msg = NO_COMMAND;
        }
    } else {
        // data byte
        uint8_t data = code & 0x7F;
        switch (msg) {
        case NOTE_ON_COMMAND:
            note = data;
            msg = NOTE_ON_NOTE;
            break;
        case NOTE_ON_NOTE:
            if (data == 0) {
                led_setnote(note, false);
            } else {
                led_setnote(note, true);
            }
            msg = NOTE_ON_COMMAND;
            break;
        case NOTE_OFF_COMMAND:
            note = data;
            msg = NOTE_OFF_NOTE;
            break;
        case NOTE_OFF_NOTE:
            led_setnote(note, false);
            msg = NOTE_OFF_COMMAND;
            break;
        default:
            break;
        }
    }
}

void main_init()
{
    led_init();
    MX_USB_MIDI_INIT();

    if (FUNC_ERROR == midiInit()) {
        while (1) {
            HAL_Delay(500);
        }
    }

    // Wait usb configuration.
    while (1) {
        if (USBD_STATE_CONFIGURED == hUsbDeviceFS.dev_state) {
            break;
        } else {
            led_setnote(0, true);
        }
    }
    led_setnote(0, false);
}

void main_cycle()
{
    // Wait USB configuration when USB connection error has occurred.
    while (1) {
        if (USBD_STATE_CONFIGURED == hUsbDeviceFS.dev_state) {
            break;
        } else {
            HAL_Delay(200);
        }
    }

    //[USB-MIDI IN] to [MIDI JACK OUT]
    for (uint32_t cable_num = 0; cable_num < MIDI_OUT_JACK_NUM; cable_num++) {
        uint8_t uart_tx_dat;
        if (FUNC_SUCCESS == midiGetFromUsbRx(cable_num, &uart_tx_dat)) {
            decode(uart_tx_dat);
        }
    }
}

void callback()
{
    led_update();
}