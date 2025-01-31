const soap = require('soap');
const path = require('path');

/**
 * Base class for AFIP web services 
 **/
module.exports = class AfipWebService {
	constructor(webServiceOptions) {
		if (!webServiceOptions) {
			throw new Error('Missing Web Service Object');
		}

		/**
		 * Force to use SOAP Client version 1.2
		 *
		 * @var boolean
		 **/
		this.soapv12 = webServiceOptions.soapV12 || false;

		/**
		 *  Support non-standard array semantics
		 *
		 * @var boolean
		 **/
		this.nsArrayElems = typeof webServiceOptions.nsArrayElems !== 'undefined' ? webServiceOptions.nsArrayElems : true;

		/**
		 * File name for the Web Services Description Language
		 *
		 * @var string
		 **/
		this.WSDL = webServiceOptions.WSDL;

		/**
		 * The url to web service
		 *
		 * @var string
		 **/
		this.URL = webServiceOptions.URL;

		/**
		 * File name for the Web Services Description 
		 * Language in test mode
		 *
		 * @var string
		 **/
		this.WSDL_TEST = webServiceOptions.WSDL_TEST;

		/**
		 * The url to web service in test mode
		 *
		 * @var string
		 **/
		this.URL_TEST = webServiceOptions.URL_TEST;

		/**
		 * The Afip parent Class
		 *
		 * @var Afip
		 **/
		this.afip = webServiceOptions.afip;

		if (this.afip.options['production']) {
			this.WSDL = path.resolve(__dirname, '../Afip_res', this.WSDL);
		}
		else {
			this.WSDL = path.resolve(__dirname, '../Afip_res', this.WSDL_TEST);
			this.URL = this.URL_TEST;
		}
	}

	/**
	 * Send request to AFIP servers
	 * 
	 * @param operation SOAP operation to execute 
	 * @param params Parameters to send
	 **/
	async executeRequest(operation, params = {}, options) {
		// Create SOAP client
		if (!this.soapClient) {
			let soapClientOptions = {
				disableCache: true,
				forceSoap12Headers: this.soapv12,
				namespaceArrayElements: this.nsArrayElems,
				customDeserializer: {
					// this function will be used to any date found in soap responses
					date: function (text, context) {
						/* text is the value of the xml element.
						  context contains the name of the xml element and other infos :
							{
								name: 'lastUpdatedDate',
								object: {},
								schema: 'xsd:date',
								id: undefined,
								nil: false
							}
		    
						 */
						return text;
					}
				}
			};

			this.soapClient = await soap.createClientAsync(this.WSDL, soapClientOptions);
			/* Sobre escribir la URL del archivo .wsdl */
			this.soapClient.setEndpoint(this.URL);
		}

		// Call to SOAP method
		let [result] = await this.soapClient[operation + 'Async'](params, options);

		//Return response parsed as JSON
		return result;
	}
}
