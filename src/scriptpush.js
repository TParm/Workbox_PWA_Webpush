window.addEventListener('load', function(){
    console.log("Loaded.");

    // Click events opvangen.
    document.querySelector("#btnPush")
        .addEventListener('click', function(){
            console.log("Clicked to push.");

            var myHeaders = new  Headers();
            myHeaders.append("Content-Type", "application/json");
            var options =
            {
                method: "POST",
                body: JSON.stringify(
                    {
                        message: "De winnaar zal een mail ontvangen op 17/05!"
                    }),
            
                headers: myHeaders
            };

            fetch("/dist/api/trigger-push-message/", options);
        });
    });