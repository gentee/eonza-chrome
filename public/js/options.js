let lang = "en";
let langres = {
    en: {
        save: "Save",
        saved: "URL saved",
    },
    ru: {
        save: "Сохранить",
        saved: "URL сохранён",
    },
};
let lng = langres.en;

function save_options() {
    var url = document.getElementById('url').value;
    chrome.storage.sync.set({
        eonzahost: url,
    }, function () {
        var status = document.getElementById('status');
        status.textContent = lng.saved;
        setTimeout(function () {
            status.textContent = ' ';
        }, 750);
    });
}

function restore_options() {
    lang = (navigator.language || navigator.userLanguage).substr(0, 2);
    if (lang == "ru") {
        lng = langres[lang];
        document.getElementById('save').textContent = lng.save
    }
    chrome.storage.sync.get({
        eonzahost: ''
    }, function (items) {
        document.getElementById('url').value = items.eonzahost;
    });
}
document.addEventListener('DOMContentLoaded', restore_options);
document.getElementById('save').addEventListener('click',
    save_options);