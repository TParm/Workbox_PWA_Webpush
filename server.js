// Gebruik een 'Express JS' server om static files te hosten.
var express = require('express');
var app = express();

// Lokale database aanmaken.
var datastore = require('nedb');
var db = new datastore();

// Gebruik web-push voor het aanmaken van berichten.
var webpush = require('web-push');

const vapidKeys = {
    publicKey: 'BGR9dUZ-UlIFfVWIfSfkZ3lFP52RuXUPvXFE5fsL0CAXnawPKoQDLMKguQSTW6DCaCfEwMlVz9HPkXH8IztuMIM',
    privateKey: 'cJdeLej_aarHqCZEApBMu7Ikj2h58vNMtXMGwxrKIn8'
};

webpush.setVapidDetails(
    'mailto:ruben.buysschaert@vives.be',
    vapidKeys.publicKey, 
    vapidKeys.privateKey
);

// Static files beschikbaar maken.
app.use(express.static('public'));

// Ontvangen data omzetten van JSON naar JS-objecten.
app.use(express.json());

// Maak een route voor het opslaan van de subscriptions.
app.post("/api/save-subscription/", function(request, response){
    console.log("POST info arrived: ", request.body);

    // Als de data niet ok is, keer terug met foutmelding.
    if(!request.body || !request.body.endpoint){
        response.status(400);
        response.setHeader('Content-type','application/json');
        response.send(JSON.stringify({
            error: {
                id: 'no endpoint',
                message: 'Subscription must have an endpoint.'
            }
        }));
    }
    else
    {
        // Als data wel ok is, sla op in lokale database (in memory)...
        saveSubscriptionToDatabase(request.body)
        .then(function(subscriptionId) {
            console.log("Saved _id: ", subscriptionId);
            response.setHeader('Content-Type', 'application/json');
            response.send(JSON.stringify({ data: { success: true } }));
        })
        .catch(function(err) {
            console.log(err);
            response.status(500);
            response.setHeader('Content-Type', 'application/json');
            response.send(JSON.stringify({
                error: {
                            id: 'unable-to-save-subscription',
                            message: 'The subscription was received but we were unable to save it to our database.'
                        }
            }));
        });
    }
});

function saveSubscriptionToDatabase(subscription) {
    return new Promise(function(resolve, reject) {
        // Item toevoegen aan de NeDB, zie: https://github.com/louischatriot/nedb/wiki/Inserting-documents
        db.insert(subscription, function(err, newDoc) {
            if (err)
                reject(err);
            else
                // Ter info het automatisch aangemaakte _id terug meegeven.
                resolve(newDoc._id);
        });
    });
};

// Maak een route voor het pushen van notifications.
app.post("/api/trigger-push-message/", function(request, response){
    console.log("Trigger push at backend received: ", request.body);

    // Antwoorden aan aanvrager.
    response.setHeader('Content-Type', 'application/json');
    response.send(JSON.stringify({ data: { success: true } }));

    // Alle abonnementen opvragen in de database en daarnaar een berichtje pushen.
    // Info over opvragen gegevens in een NeDB, zie: https://github.com/louischatriot/nedb/wiki/Finding-documents.
    db.find({}, function (err, subscriptions) {
        console.log(subscriptions);

        if(err)
            console.log("Error during searching in NeDB: ", err);
        else
        {            
            // Er is reeds een pagina die push berichtjes kan aanvragen/versturen... Maar het kan ook via Postman.
            // Moet onderstaande meer asynchroon? Met Promises?
            for (let i = 0; i < subscriptions.length; i++) 
                triggerPushMessage(subscriptions[i], request.body.message);
        }
    });
});

// Functie die effectief de berichten pusht.
function triggerPushMessage (subscription, dataToSend)
{
    // Zie: https://www.npmjs.com/package/web-push#sendnotificationpushsubscription-payload-options.
    // Deze functie return't een Promise die resulteert in een object of error.
    return webpush.sendNotification(subscription, dataToSend)
        .catch((err) => {
            if (err.statusCode === 404 || err.statusCode === 410) 
            {
                console.log('Subscription has expired or is no longer valid: ', err);

                // Het bewuste abonnement verwijderen. Nog verder testen.
                db.remove({_id: subscription._id},{}, function(){
                    console.log("Subscription removed with _id: ", subscription._id);
                });
            }
            else
            {
                throw err;
            }
        });
};


// Start de server en 'luister' op poort 3000.
app.listen(8081);
console.log("Express server gestart op http://localhost:3000");
