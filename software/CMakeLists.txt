cmake_minimum_required(VERSION 3.1)
project(u2midi)

file(GLOB SOURCE_FILE  ${CMAKE_CURRENT_SOURCE_DIR}/src/*.cpp ${CMAKE_CURRENT_SOURCE_DIR}/midifile/src/*.cpp)

# OpenCVのビルド環境の設定ファイルを読み込む
find_package(OpenCV REQUIRED)

# OpenCV関係のインクルードディレクトリのパスを設定
include_directories(
    ${OpenCV_INCLUDE_DIRS} "include" "midifile/include"
)

# 実行ファイル名を設定
add_executable(main
    ${SOURCE_FILE}
)

# リンクするライブラリを読み込む
target_link_libraries(main
    ${OpenCV_LIBRARIES}
)