new Vue({
  el: "#app",
  data: {
    video_lists: [
    ["きらきら星", "videos/beginner/kirakira_boshi.mp4", "videos/beginner/kirakira_boshi.png"],
    ["さんぽ", "videos/beginner/sanpo.mp4", "videos/beginner/sanpo.png"],
    ["かえるのうた", "videos/intermediate/kaeru_no_uta.mp4", "videos/intermediate/kaeru_no_uta.png"],
    ["となりのトトロ", "videos/intermediate/tonari_no_totoro.mp4", "videos/intermediate/tonari_no_totoro.png"],
    ["ビリーブ", "videos/advanced/believe.mp4", "videos/advanced/believe.png"],
    ["カントリーロード", "videos/advanced/country_road.mp4", "videos/advanced/country_road.png"],
    ],
    beginner_list: [0,1],
    intermediate_list: [2,3],
    advanced_list: [4,5],
  }
}); 