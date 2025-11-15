class LoadScreen{
    constructor(amount, message = '', callback = null){
        this.counter = 0;
        this.amount = amount;
        this.message = message;
        this.callback = callback;
    }

    startLoad(){
        setTimeout(() => { 
            document.querySelector('#myNavigator').pushPage('./views/loadScreen.html');
         }, 400);
    }

    elementLoaded(){
        this.counter++;
        setTimeout(() => document.querySelector('#load_stage').textContent = `${this.counter}/${this.amount}`, 600);
        if(this.counter >= this.amount){
            this.finishLoad()
        }
    }

    finishLoad(){
        setTimeout(() => {
            document.querySelector('#myNavigator').popPage();
            if (this.callback) {
                this.callback();
                return;
            }
            if (this.message != '') {
                ons.notification.alert({title: 'Загрузка', message: this.message});
            }
        }, 800);
    }
}