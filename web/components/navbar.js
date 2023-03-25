Vue.component('vue_navbar', {
    template:`
        <nav class="navbar navbar-expand-lg navbar-dark bg-primary">
            <div class="container-fluid">
                <a class="navbar-brand link-light" href="https://hamataku.github.io/Uplight/web/index.html">Uplight</a>
                <button class="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#navbarSupportedContent" aria-controls="navbarSupportedContent" aria-expanded="false" aria-label="Toggle navigation">
                    <span class="navbar-toggler-icon"></span>
                </button>
                <div class="collapse navbar-collapse" id="navbarSupportedContent">
                    <ul class="navbar-nav me-auto mb-2 mb-lg-0">
                        <li class="nav-item">
                            <a class="nav-link active link-light" aria-current="page" href="https://hamataku.github.io/Uplight/web/index.html">ホーム</a>
                        </li>
                        <li class="nav-item">
                            <a class="nav-link active link-light" aria-current="page" href="https://hamataku.github.io/Uplight/web/video.html">オンライン</a>
                        </li>
                        <li class="nav-item">
                            <a class="nav-link link-light" href="https://github.com/hamataku/Uplight">Github<i class="fa-brands fa-github"></i></a>
                        </li>
                    </ul>
                </div>
            </div>
        </nav>
      `
})
