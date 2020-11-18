const mixin = {
    data: {
        months: ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"]
    },
    methods: {
        currentDate: function () {
            let date = new Date();
            let formatted = `${date.getDate().toString().padStart(2, '0')} ${this.months[date.getMonth()]} ${date.getFullYear()}`;
            return formatted;
        }
    }
}


window.mixins = ( (window.mixins && window.mixins.push(mixin)), window.mixins) || [mixin];