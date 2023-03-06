#pragma once
#include "main.h"
#include <stdbool.h>

void led_init(void);
void led_setnote(int16_t note, bool state);
void led_update(void);
