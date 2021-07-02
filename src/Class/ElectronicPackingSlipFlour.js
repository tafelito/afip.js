const AfipWebService = require('@afipsdk/afip.js/src/Class/AfipWebService');

/**
 * SDK for AFIP Electronic Packing Slip (wsremhRemHarinaServicearina)
 *
 * @link https://www.afip.gob.ar/ws/remitoHTSDMT/Manual_Desarrollador_WSREMHARINA_v2.4.pdf WS Specification
 **/
module.exports = class ElectronicPackingSlipFlour extends AfipWebService {
  constructor(afip) {
    const options = {
      WSDL: 'wsremharina-production.wsdl',
      URL: 'https://serviciosjava.afip.gob.ar/wsremharina/RemHarinaService',
      WSDL_TEST: 'wsremharina.wsdl',
      URL_TEST: 'https://fwshomo.afip.gov.ar/wsremharina/RemHarinaService',
      afip
    }

    super(options);
  }

  /**
   * Asks to AFIP Servers for receivers packing slips {@see WS
   * Specification item 2.5.14}
   *
   * @return array All packing slips
   **/
  async getPackingSlipsReceivers({ statusType, page = 1 }) {
    const res = await this.executeRequest('consultarRemitosReceptor', {
      estadoRecepcion: statusType,
      // nroPagina: page,
    }, 'consultarRemitos');
    return res
  }

  /**
   * Send AFIP reception of packing slips {@see WS
   * Specification item 2.5.7}
   *
   * @param long number 		Slip Number to register reception
   * @param string status 		One of ACE, ACP or NAC
   * @param date date 		Effective date of the reception
   * @return object {codRemito : slip code to register, evento: system event, if exists,
   *  arrayObservaciones: array of observations, if exists, arrayErrores: array of errors }
   **/
  async registerReception({ slipCode, status, date }) {
    const res = await this.executeRequest('registrarRecepcion', {
      codRemito: slipCode,
      estado: status,
      fecha: date
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

    const { token, sign } = await this.afip.GetServiceTA('wsremharina');

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

