class DrawButton extends ol.control.Control {
    constructor(opt_options) {
        const options = opt_options || {};

        const drawButton = ons.createElement(`<div class='map-button draw-button' id='draw-button'><ons-fab>
            <ons-icon class='icon' icon='md-plus'></ons-icon>
        </ons-fab></div>`);

        super({
            element: drawButton,
            target: options.target,
        });

        drawButton.addEventListener('click', this.clickDrawButton.bind(this), false);
    }

    clickDrawButton(){
        let drawBar = document.querySelector('#downbar-wrapper')
        let style = window.getComputedStyle(drawBar);
        let display = style.getPropertyValue('display');
        if(display == 'none'){
            openDrawBar()
        }
        else{
            closeDrawBar()
        }
    }
}