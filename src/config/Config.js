export class Config {
    static BREAKPOINT = 1000;

    static CDN = '';

    static ASSETS = [
        '/assets/images/dknight.svg',
        '/assets/images/frame.svg'
    ];

    static GUI = /[?&]ui/.test(location.search);
    static ORBIT = /[?&]orbit/.test(location.search);
}
