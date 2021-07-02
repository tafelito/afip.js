const AfipWebService = require('@afipsdk/afip.js/src/Class/AfipWebService');

/**
 * SDK for AFIP Electronic Packing Slip (RemAzucarService)
 *
 * @link https://www.afip.gob.ar/ws/remitoElecAzucar/Manual-DesarrolladorWSREMAZUCAR-v2_0_8.pdf WS Specification
 **/
module.exports = class ElectronicPackingSlipSugar extends AfipWebService {
  constructor(afip) {
    const options = {
      WSDL: 'wsremazucar-production.wsdl',
      URL: 'https://serviciosjava.afip.gob.ar/wsremazucar/RemAzucarService',
      WSDL_TEST: 'wsremazucar.wsdl',
      URL_TEST: 'https://fwshomo.afip.gov.ar/wsremazucar/RemAzucarService',
      afip
    }

    super(options);
  }

  /**
   * Asks to AFIP Servers for receivers packing slips {@see WS
   * Specification item 19}
   *
   * @param Date fromDate 		From Date to get the slips (required)
   * @param Date toDate 		To Date to get the slips (required)
   * @param String status 		Status of the slip. Possible values are "EMI" | "ACE" | "ACP" | "NAC" | "CON" | "NCO"
   * @param int page 			Number of page results
   * @return array All packing slips
   **/
  async getPackingSlipsReceivers({ fromDate, toDate, status, page = 0 }) {
    const res = await this.executeRequest('consultarRemitosReceptor', {
      fechaDesde: fromDate,
      fechaHasta: toDate,
      estado: status,
      // numeroPagina: page,
    });
    return res
  }

  /**
   * Send AFIP reception of packing slips {@see WS
   * Specification item 16.4}
   *
   * @param long number 		Slip Number to register reception
   * @param string status 		Reception approved or not. Possible values are "S" | "N"
   * @return object {codRemito : slip code to register, evento: system event, if exists,
   *  arrayObservaciones: array of observations, if exists, arrayErrores: array of errors }
   **/
  async registerReception({ slipCode, status }) {
    const res = await this.executeRequest('confirmarRecepcionMercaderia', {
      codigoRemito: slipCode,
      aceptaRecepcion: status
    });
    return res
  }

  /**
   * Asks to web service for servers status {@see WS
   * Specification item 4.14}
   *
   * @return object { AppServer : Web Service status,
   * DbServer : Database status, AuthServer : Autentication
   * server status}
   **/
  async getServerStatus() {
    return await this.executeRequest('FEDummy');
  }

  /**
   * Sends request to AFIP servers
   *
   * @param string 	operation 	SOAP operation to do
   * @param array 	params 	Parameters to send
   * @param string 	resultOperation 	SOAP operation result, if different than req
   *
   * @return mixed Operation results
   **/
  async executeRequest(operation, params = {}, resultOperation = operation) {
    // Object.assign(params, await this.getWSInitialRequest(operation));
    const authParams = await this.getWSInitialRequest(operation);

    const results = await super.executeRequest(operation, { ...authParams, ...params });

    await this._checkErrors(resultOperation, results);

    return results[resultOperation + 'Return'];
  }

  /**
   * Make default request parameters for most of the operations
   *
   * @param string operation SOAP Operation to do
   *
   * @return array Request parameters
   **/
  async getWSInitialRequest(operation) {
    if (operation === 'FEDummy') {
      return {};
    }

    const { token, sign } = await this.afip.GetServiceTA('wsremazucar');

    return {
      'authRequest': {
        'token': token,
        'sign': sign,
        'cuitRepresentada': this.afip.CUIT
      }
    };
  }

  /**
   * Check if occurs an error on Web Service request
   *
   * @param string 	operation 	SOAP operation to check
   * @param mixed 	results 	AFIP response
   *
   * @throws Exception if exists an error in response
   *
   * @return void
   **/
  async _checkErrors(operation, results) {
    const res = results[operation + 'Return'];

    // if (operation === 'FECAESolicitar') {
    //   if (Array.isArray(res.FeDetResp.FECAEDetResponse)) {
    //     res.FeDetResp.FECAEDetResponse = res.FeDetResp.FECAEDetResponse[0];
    //   }

    //   if (res.FeDetResp.FECAEDetResponse.Observaciones && res.FeDetResp.FECAEDetResponse.Resultado !== 'A') {
    //     res.Errors = { Err: res.FeDetResp.FECAEDetResponse.Observaciones.Obs };
    //   }
    // }

    if (res.Errors) {
      const err = Array.isArray(res.Errors.Err) ? res.Errors.Err[0] : res.Errors.Err;
      throw new Error(`(${err.Code}) ${err.Msg}`, err.Code);
    }
  }

}

