cmake_minimum_required(VERSION 3.10)

set(CMAKE_SYSTEM_NAME Generic)
set(CMAKE_TRY_COMPILE_TARGET_TYPE "STATIC_LIBRARY")

SET(CMAKE_C_COMPILER arm-none-eabi-gcc CACHE STRING "arm-none-eabi-gcc")
SET(CMAKE_CXX_COMPILER arm-none-eabi-g++ CACHE STRING "arm-none-eabi-g++")
SET(AS arm-none-eabi-gcc  CACHE STRING "arm-none-eabi-as")
SET(CMAKE_AR arm-none-eabi-ar CACHE STRING "arm-none-eabi-ar")
SET(CMAKE_LD arm-none-eabi-ld CACHE STRING "arm-none-eabi-ld")
SET(NM arm-none-eabi-nm CACHE STRING "arm-none-eabi-nm")
SET(OBJCOPY arm-none-eabi-objcopy CACHE STRING "arm-none-eabi-objcopy")
SET(OBJDUMP arm-none-eabi-objdump CACHE STRING "arm-none-eabi-objdump")
SET(READELF arm-none-eabi-readelf CACHE STRING "arm-none-eabi-readelf")
SET(CMAKE_RANLIB arm-none-eabi-ranlib CACHE STRING "arm-none-eabi-ranlib")

enable_language(C)
enable_language(CXX)
enable_language(ASM)

# project name and language to use
project(uplight CXX)
string(ASCII 27 Esc)
if(CMAKE_BUILD_TYPE STREQUAL "")
    set(CMAKE_BUILD_TYPE Release)
endif()

# set compiler option
set(COMPILER_OPT_FLAGS "-O2 -mtune=cortex-m3")
set(COMMON_COMPILER_FLAGS "-mcpu=cortex-m3 -mthumb -DUSE_HAL_DRIVER -DSTM32F103xB -Wall -Wextra -Wno-missing-field-initializers -Wno-attributes -fdata-sections -fsingle-precision-constant -ffunction-sections ${COMPILER_OPT_FLAGS}")
set(CMAKE_C_FLAGS "${COMMON_COMPILER_FLAGS} -std=gnu99 -Wno-unused-parameter ${CMAKE_C_FLAGS}")
set(CMAKE_C_FLAGS_DEBUG "-g")
set(CMAKE_C_FLAGS_RELEASE "")
set(CMAKE_CXX_FLAGS "${COMMON_COMPILER_FLAGS} ${CMAKE_CXX_FLAGS} -std=gnu++17")
set(CMAKE_CXX_FLAGS_DEBUG "-g")
set(CMAKE_CXX_FLAGS_RELEASE "")
set(CMAKE_ASM_FLAGS "${COMMON_COMPILER_FLAGS}  ${CMAKE_ASM_FLAGS}")
set(CMAKE_ASM_FLAGS_DEBUG "-g")
set(CMAKE_ASM_FLAGS_RELEASE "")

# Echo compile flags
message("Build type:\n\t${CMAKE_BUILD_TYPE}")
if(CMAKE_BUILD_TYPE STREQUAL "Debug")
    message("Compile flags:\n\t${CMAKE_CXX_FLAGS} ${CMAKE_CXX_FLAGS_DEBUG}")
elseif(CMAKE_BUILD_TYPE STREQUAL "Release")
    message("Compile flags:\n\t${CMAKE_CXX_FLAGS} ${CMAKE_CXX_FLAGS_RELEASE}")
else()
    message("Compile flags:\n\t${CMAKE_CXX_FLAGS}")
endif()

set(CMAKE_EXE_LINKER_FLAGS "-mcpu=cortex-m3 -mthumb -march=armv7e-m  -specs=nosys.specs -specs=nano.specs -T ${CMAKE_SOURCE_DIR}/STM32F103CBTx_FLASH.ld -lc -lm  -Wl,--gc-sections -u _printf_float -Wl,-Map=${CMAKE_PROJECT_NAME}.map -Wl,--print-memory-usage")

include_directories("inc" "Core/Inc" "Drivers/CMSIS/Device/ST/STM32F1xx/Include" "Middlewares_MIDI/ST/STM32_USB_Device_Library/Class/USBMIDI/Inc" "Middlewares_MIDI/ST/STM32_USB_Device_Library/Core/Inc" "USB_DEVICE_MIDI/App" "USB_DEVICE_MIDI/Target" "Drivers/CMSIS/Include" "Drivers/CMSIS/Device/ST/STM32F1xx/Include" "Drivers/STM32F1xx_HAL_Driver/Inc" "Drivers/STM32F1xx_HAL_Driver/Inc/Legacy")

file(GLOB MAIN_SOURCE "src/*.cpp" "src/*.c")
file(GLOB CUBEMX_SOURCE "Core/Src/*.c"  "*.s" "Drivers/STM32F1xx_HAL_Driver/Src/*.c" "Middlewares_MIDI/ST/STM32_USB_Device_Library/Class/USBMIDI/Src/*.c" "Middlewares_MIDI/ST/STM32_USB_Device_Library/Core/Src/*.c" "USB_DEVICE_MIDI/App/*.c" "USB_DEVICE_MIDI/Target/*.c")
# list(REMOVE_ITEM CUBEMX_SOURCE "${CMAKE_SOURCE_DIR}/Core/Src/main.c")
# list(REMOVE_ITEM CUBEMX_SOURCE "${CMAKE_SOURCE_DIR}/Core/Src/stm32f4xx_it.c")

add_executable(${PROJECT_NAME}.elf ${MAIN_SOURCE} ${CUBEMX_SOURCE})

add_custom_target(${PROJECT_NAME}.hex ALL
    COMMAND arm-none-eabi-objcopy --output-format=ihex ${PROJECT_NAME}.elf ${PROJECT_NAME}.hex DEPENDS ${PROJECT_NAME}.elf)

if(EXISTS /proc/sys/fs/binfmt_misc/WSLInterop)
   # WINDOWS(WSL)
   add_custom_target(write COMMAND make -j4 COMMAND /mnt/c/Program\ Files/STMicroelectronics/STM32Cube/STM32CubeProgrammer/bin/STM32_Programmer_CLI.exe -c port=SWD -d ./${PROJECT_NAME}.elf -s)
elseif(EXISTS /Applications/STMicroelectronics)
   # MAC
   add_custom_target(write COMMAND make -j4 COMMAND /Applications/STMicroelectronics/STM32Cube/STM32CubeProgrammer/STM32CubeProgrammer.app/Contents/MacOs/bin/STM32_Programmer_CLI -c port=SWD -d ./${PROJECT_NAME}.elf -s)
else()
   # Native LINUX
   add_custom_target(write COMMAND make -j4 COMMAND $ENV{HOME}/STMicroelectronics/STM32Cube/STM32CubeProgrammer/bin/STM32_Programmer_CLI -c port=SWD -d ./${PROJECT_NAME}.elf -s)
endif()
