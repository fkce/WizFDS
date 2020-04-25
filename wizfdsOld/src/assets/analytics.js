import { environment } from '../environments/environment';

export function googleAnalyticsHeadScripts() {
    const head = document.getElementsByTagName('head')[0];

    const gScript1 = document.createElement('script');
    gScript1.async = true;
    gScript1.src = 'https://www.googletagmanager.com/gtag/js?id=' + environment.google_analytics_code;

    const gScript2 = document.createElement('script');
    gScript2.innerHTML = '    window.dataLayer = window.dataLayer || [];\n' +
                         '    function gtag(){dataLayer.push(arguments);}\n' +
                         '    gtag(\'js\', new Date());\n\n' +
                         '    gtag(\'config\', \'' + environment.google_analytics_code + '\');';

    head.insertBefore(gScript2, head.firstChild);
    head.insertBefore(gScript1, head.firstChild);
}

export function googleAnalytics(url) {
    gtag('config', environment.google_analytics_code, { 'page_path': url });
}