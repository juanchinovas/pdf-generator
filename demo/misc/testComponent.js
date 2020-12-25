Vue.component('test-component', {
    props: ["propTop"],
    created: function(){
        console.log("On component");
    },
    template: '<div><h5>I am a component content on template{{propTop}}</h5></div>'
})