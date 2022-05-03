import { Link } from 'react-router-dom';

function Button(props) {
    return(
        <Link to={props.endpoint}>
            <button>{props.btnName}</button>
        </Link>
    )
}

export default Button;