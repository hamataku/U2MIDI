#pragma once
#include <string>
#include <opencv2/opencv.hpp>

struct KeyInfo {
    int left;
    int right;
    int scale;  // 0 means C
};

namespace Recognize
{
void getKeyPosition(cv::VideoCapture& video, int frame_num, std::vector<KeyInfo>& key_info_list);
void getKeyPosition(cv::VideoCapture& video, std::vector<KeyInfo>& key_info_list, int start_frame, int end_frame);
}  // namespace Recognize