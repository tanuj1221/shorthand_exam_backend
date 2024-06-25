exports.pingMe = (req, res) => {
    console.log("Yup its up, fr!");
    res.send("yup, the server is up!");
    return;
}