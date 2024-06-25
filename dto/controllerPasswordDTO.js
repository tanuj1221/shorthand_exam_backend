class ControllerPasswordDTO {
    constructor(center, batchNo, controllerPass, startTime, endTime, batchStatus) {
        this.center = center;
        this.batchNo = batchNo;
        this.controllerPass = controllerPass; 
        this.startTime = startTime;
        this.endTime = endTime;
        this.batchStatus = batchStatus;
    }
}

module.exports = ControllerPasswordDTO;