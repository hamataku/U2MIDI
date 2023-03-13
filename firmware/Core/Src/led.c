#include "led.h"

#include "gpio.h"
#include "spi.h"
#include "tim.h"
#include <string.h>

#define BAR_NUM 8
uint16_t led_data[BAR_NUM];

void led_init()
{
    SET_BIT(SPI1->CR1, SPI_CR1_SPE);
    memset(led_data, 0, sizeof(led_data));
    HAL_TIM_Base_Start_IT(&htim2);
    for (int i = 0; i < BAR_NUM * 12; i++) {
        led_setnote(i, true);
        HAL_Delay(5);
        led_setnote(i, false);
    }
}

void led_setnote(int16_t note, bool state)
{
    if (note < 0 || note > BAR_NUM * 12 - 1) {
        return;
    }
    if (state) {
        led_data[note / 12] |= 1 << (note % 12);
    } else {
        led_data[note / 12] &= ~(1 << (note % 12));
    }
}

void led_update()
{
    RATCH_GPIO_Port->BSRR = RATCH_Pin << 16;
    for (int i = 0; i < BAR_NUM; i++) {
        while (!(SPI1->SR & SPI_SR_TXE)) {
        }
        *(volatile uint16_t*)&SPI1->DR = led_data[BAR_NUM - 1 - i];
        while (!(SPI1->SR & SPI_SR_RXNE)) {
        }
        SPI1->DR;
    }
    RATCH_GPIO_Port->BSRR = RATCH_Pin;
}