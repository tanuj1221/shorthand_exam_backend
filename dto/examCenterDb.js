class ExamCenterDTO {
    constructor(center, center_name, center_address, pc_count, max_pc) {
        this.center = center;
        this.center_name = center_name; // Added missing parameter
        this.center_address = center_address;
        this.pc_count = pc_count;
        this.max_pc = max_pc;
    }
}

module.exports = ExamCenterDTO;
