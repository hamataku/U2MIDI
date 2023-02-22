#include "recognize.hpp"
#include <vector>
#include <cmath>
#include <array>

#define THRESHOLD 100
#define MAX_DISTANCE 50

namespace Recognize
{
void getKeyPosition(cv::VideoCapture& video, int frame_num, std::vector<KeyInfo>& key_info_list)
{
    cv::Mat img, edge, dst;

    if (frame_num > video.get(cv::CAP_PROP_FRAME_COUNT)) {
        perror("frame_num exceeds the number of frames");
        exit(1);
    }

    // get frame
    video.set(cv::CAP_PROP_POS_FRAMES, frame_num);
    video.read(img);

    // cut out the part of the keyboard
    int start_row = img.rows / 3 * 2;
    img = img(cv::Rect(0, start_row, img.cols, img.rows - start_row));

    // gray scale & threshold & canny
    cv::cvtColor(img, edge, cv::COLOR_BGR2GRAY);
    cv::threshold(edge, edge, THRESHOLD, 255, cv::THRESH_BINARY);
    Canny(edge, edge, 100, 200);

    // line detection
    std::vector<cv::Vec4i> lines;
    cv::HoughLinesP(
        edge,   // 8ビット，シングルチャンネルの2値入力画像．この画像は関数により書き換えられる可能性があり.
        lines,  // 検出された線分が出力されるベクトル
        1,      // ピクセル単位での距離分解能.
        CV_PI,  // ラジアン単位での角度分解能
        80,     // 閾値.thresholdを十分に超えている直線のみが出力対象.
        30,     // 最小の線分長
        2       // 2点が同一線分上にあると見なす場合に許容される最大距離
    );

    // sort position of lines
    std::vector<std::array<int, 2>> pos_list;
    for (auto line : lines) {
        pos_list.push_back({line[0], line[1]});
    }
    std::sort(pos_list.begin(), pos_list.end(), [](std::array<int, 2> a1, std::array<int, 2> a2) { return a1[0] < a2[0]; });

    // thin out the lines
    for (int i = 0; i < pos_list.size() - 1; i++) {
        if (std::abs(pos_list[i][0] - pos_list[i + 1][0]) < 5) {
            pos_list[i + 1][0] = (pos_list[i][0] + pos_list[i + 1][0]) / 2;
            pos_list[i + 1][1] = std::max(pos_list[i][1], pos_list[i + 1][1]);
            pos_list.erase(pos_list.begin() + i);
        }
    }

    // detect first long line between B and C
    int threshold = img.rows - 30;
    int standard = 0;
    for (int i = 0; i < pos_list.size() - 13; i++) {
        if (pos_list[i][1] > threshold && pos_list[i + 5][1] > threshold && pos_list[i + 12][1] > threshold) {
            standard = (i / 12 + 1) * 12 + (i % 12);
            printf("standard: %d\n", standard);
            break;
        }
    }

    // make key_info_list
    for (int i = 0; i < pos_list.size() + 1; i++) {
        KeyInfo key_info;
        if (i == 0) {
            key_info.left = 0;
        } else {
            key_info.left = pos_list[i - 1][0];
        }
        if (i == pos_list.size()) {
            key_info.right = img.cols;
        } else {
            key_info.right = pos_list[i][0];
        }
        key_info.scale = i - standard;

        key_info_list.push_back(key_info);
    }

    for (auto pos : pos_list) {
        cv::line(img, cv::Point(pos[0], 0), cv::Point(pos[0], pos[1]), cv::Scalar(0, 255, 0), 1);
    }

    // imgの表示
    // cv::imshow("img", img);
}

}  // namespace Recognize