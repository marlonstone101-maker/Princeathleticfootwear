var Request = require('request');

var payment_url = {
    "Live" : "https://wipayfinancial.com/v1/gateway_live",
    "Sandbox" : "https://sandbox.wipayfinancial.com/v1/gateway"
}

module.exports = {
    mode : "Sandbox",

    ProductionMode: (mode)=> {
        if (mode) {
            this.mode = 'Live';
        } else {
            this.mode = 'Sandbox';
        }
    },
    create_payment: (payloadData)=> {
        return new Promise((resolve, reject)=>{
            try {
                var formData = {
                    total : payloadData.total,
				    phone : payloadData.phone,
				    email : payloadData.email,
				    name : payloadData.name,
				    order_id : payloadData.order_id,
				    return_url : payloadData.return_url,
				    developer_id : payloadData.developer_id?payloadData.developer_id : '1'
                }
                Request.post({url : payment_url[this.mode], formData },(error, httpResponse, body)=> {
                if (error) reject(error.message);
                let result = httpResponse.headers.location;
                resolve(result);
                });
            } catch (error) {
                reject(error.message)
            }
        })
    }
}

