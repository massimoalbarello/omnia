import Button from './Button';

function Sender() {
    return(
        <div>
            <h1>Sender</h1>
            <Button btnName="Share screen" endpoint="share"/>
            <br />
            <br />
            <Button btnName="Data channel" endpoint="channel"/>
        </div>
    )
}

export default Sender;