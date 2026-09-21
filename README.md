# Fresh Start Canvas

I need a blank project

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/108f6a86-e752-4d3b-9fca-288fceb5abc7).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```

## Contact form delivery

The contact form posts to FormSubmit and routes inquiries to
`hello@thedeptcollective.com`. The visitor's email is used as the reply-to address.
Required fields use browser validation; FormSubmit handles the spam check,
submission confirmation, and delivery. No email API key is exposed in the client.

**One-time activation is required before email delivery is live:**

1. Publish the updated site and submit a test through its contact form.
2. Open the FormSubmit activation email sent to `hello@thedeptcollective.com`
   (check spam as well) and confirm the form.
3. Submit another test from the published site and confirm that the inquiry
   arrives, all fields are included, and Reply targets the visitor's email.

Do not treat a successful build or a submitted form as proof of inbox delivery.
The mailbox owner must complete activation and verify receipt.
See https://formsubmit.co/documentation and https://formsubmit.co/help.
