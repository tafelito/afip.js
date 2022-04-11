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
   * Asks to AFIP Servers for packing slip {@see WS
   * Specification item 2.5.12}
   *
   * @return Detailed generated packing slip
   **/
  async getPackingSlip({ slipCode, idReq, type, loc, refNumber, cuit }) {
    const res = await this.executeRequest('consultarRemito', {
      ...(slipCode && { codRemito: slipCode }),
      ...(idReq && { idReqCliente: idReq }),
      ...(type && { tipoComprobante: type }),
      ...(loc && { puntoEmision: loc }),
      ...(refNumber && { nroComprobante: refNumber }),
      ...(cuit && { cuitEmisor: cuit }),
    }, undefined, 'consultarRemito');
    return res
  }

  /**
   * Asks to AFIP Servers for receivers packing slips {@see WS
   * Specification item 2.5.14}
   *
   * @return array All packing slips
   **/
  async getPackingSlipsReceivers({ statusType, fromDate, toDate, page = 1 }) {
    const res = await this.executeRequest('consultarRemitosReceptor', {
      estadoRecepcion: statusType,
      ...(fromDate && toDate ? {
        rangoFechas: {
          fechaDesde: fromDate,
          fechaHasta: toDate
        },
      } : undefined)
      // nroPagina: page,
    }, undefined, 'consultarRemitos');
    return res
  }

  /**
   * Send AFIP reception of packing slips {@see WS
   * Specification item 2.5.7}
   *
   * @param long number 		Slip Number to register reception
   * @param string status 		One of ACE, ACP or NAC
   * @param date date 		Effective date of the reception
   * @param array products 		List of products to regitser
   * @return object {codRemito : slip code to register, evento: system event, if exists,
   *  arrayObservaciones: array of observations, if exists, arrayErrores: array of errors }
   **/
  async registerReception({ slipCode, status, date, products }) {
    const res = await this.executeRequest('registrarRecepcion', {
      codRemito: slipCode,
      fecha: date,
      aceptado: status,
      arrayRecepcionMercaderia: products
    }, undefined, 'operacion');
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
    const res = await this.executeRequest('dummy', undefined, {
      postProcess: function (_xml) {
        return _xml.replace('<dummyRequest></dummyRequest>', '');
      }
    });
    return res
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
  async executeRequest(operation, params = {}, options, resultOperation = operation) {
    // Object.assign(params, await this.getWSInitialRequest(operation));
    const authParams = await this.getWSInitialRequest(operation);

    const results = await super.executeRequest(operation, { ...authParams, ...params }, options);

    // await this._checkErrors(resultOperation, results);

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
    if (operation === 'dummy') {
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

    if (res?.Errors) {
      const err = Array.isArray(res.Errors.Err) ? res.Errors.Err[0] : res.Errors.Err;
      throw new Error(`(${err.Code}) ${err.Msg}`, err.Code);
    }
  }

}

