const connection = require('../../config/db1');
const StudentTableDTO = require('../../dto/studentTableDTO');

exports.updateTable = async (req, res) => {
    const tableName = req.params.table_name;
    const id = req.params.id;
    const updatedData = req.body;

    console.log("tableName: "+tableName);
    console.log("id: "+id);
    console.log("updatedData: "+updatedData);

    let updateQuery = `UPDATE ?? SET ? WHERE `;

    if(tableName=="students"){
        updateQuery+= `student_id = ? `;
    }else if(tableName=="admindb"){
        updateQuery+= `adminid = ? `;
    }else if(tableName=="audiodb"){
        updateQuery+= `subjectId = ? `;
    }else if(tableName=="audiologs"){
        updateQuery+=`student_id = ?`;
    }else if(tableName=="batchdb"){
        updateQuery+=`batchNo = ?`;
    }else if(tableName=="controllerdb"){
        updateQuery+=`center = ?`;
    }else if(tableName=="examcenterdb"){
        updateQuery+=`center = ?`;
    }else if(tableName=="feedbackdb"){
        updateQuery+=`student_id = ?`;
    }else if(tableName=="finalpassagesubmit"){
        updateQuery+=`student_id = ?`;
    }else if(tableName=="loginlogs"){
        updateQuery+=`id = ?`;
    }else if(tableName=="pcregistration"){
        updateQuery+=`id = ?`;
    }else if(tableName=="studentlogs"){
        updateQuery+=`id = ?`;
    }else if(tableName=="subjectdb"){
        updateQuery+=`subjectId = ?`;
    }else if(tableName=="textlogs"){
        updateQuery+=`id = ?`;
    }else{
        console.error("No table selected!!", "Please select the table");
    }

    //const updateQuery = `UPDATE ?? SET ? WHERE student_id = ?`;


    let queryParam = [tableName, updatedData, id];

    try{
        console.log("query: "+updateQuery);
        const [results] = await connection.query(updateQuery, queryParam);

        console.log(results);
        if (results.affectedRows === 0) {
            res.status(404).send("No records found to update.");
            
        } else {
            res.status(200).send("Update successful.");  
        }
    }catch(err){
        console.error("Error executing query:", err.message);
        res.status(500).send(err.message);
    }
}