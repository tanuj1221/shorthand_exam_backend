exports.pingMe = (req, res) => {
    console.log("Service is up!");
    res.send("yup, the server is up!");
    return;
}