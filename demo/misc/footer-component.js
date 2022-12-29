Vue.component('footer-component', {
    props: ["title"],
    created: function(){
        console.log("On component footer");
    },
    template: `
    <footer data-margin-bottom="3cm" id="page-footer">
        <span class="date"></span>
        <span style="text-transform: uppercase">{{title}} {{(new Date()).getFullYear()}}&copy;</span>
        <v-style>
            #page-footer {
                font-size: 8px;
                width: 100%; 
                padding: 1% 2cm;
                display: flex; 
                align-items: center;
                justify-content: space-between;
                background-color: orchid;
                font-weight: bold;
                color: #FFF;
            }
        </v-style>
        <div>
            <span class="pageNumber"></span> of <span class="totalPages"></span>
        </div>
    </footer>`
});