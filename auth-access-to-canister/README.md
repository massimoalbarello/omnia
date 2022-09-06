Start a local DFX environment in the `./auth-client-demo` directory:
`cd auth-client-demo`
`dfx start --background --clean`
`dfx deploy`

Run the Internet Identity canister locally:
`cd ../using-dev-build`
`rm -rf .dfx/local`
`II_FETCH_ROOT_KEY=1 II_DUMMY_CAPTCHA=1  dfx deploy --no-wallet --argument '(null)'`
`dfx deploy --no-wallet --argument '(null)'`

Once the deployment is done, copy the canister ID fom the Internet Identity canister, and paste it into `./auth-client-demo/webpack.config.js` as a value of `LOCAL_II_CANISTER`.

Finally, run `npm start`. You can now access the app at `http://localhost:8080`.

To terminate use `Ctrl+C` and then `dfx stop` in `./auth-client-demo`.