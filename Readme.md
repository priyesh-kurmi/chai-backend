Chai aur backend learnings

Here's my notes what I've learned in backend from this course.


# dev-dependencies and dependencies
nodemon           -	Auto-restarts the server on file changes
prettier          -	Formats code for consistency
bcrypt            -	Hashes passwords for security
cloudinary        -	Uploads & manages images
cookie-parser     -	Reads cookies from requests
cors              -	Enables cross-origin requests
dotenv            -	Loads environment variables from .env
express           -	Handles routes, middleware, and APIs
jsonwebtoken      -	Generates & verifies JWT tokens for authentication
mongoose          -	Manages MongoDB interactions
multer            -	Handles file uploads
mongoose-aggregate-paginate-v2  - Helps paginate large MongoDB queries

# Full Flow Recap
Step	Task	Files Created
1.	Initialize project - package.json, install dependencies
2.	Create utility functions
        - ApiError.js, 
        - ApiResponse.js, 
        - asyncHandler.js, 
        - cloudinary.js
3.	Setup environment variables - .env
4.	Setup database connection - /src/db/index.js
5.	Define models - /src/models/user.model.js, video.model.js, etc.
6.	Implement middleware - /src/middlewares/auth.middleware.js, multer.middleware.js
7.	Implement controllers - /src/controllers/user.controller.js, video.controller.js
8.	Define routes - /src/routes/user.routes.js, video.routes.js
9.	Setup Express app - /src/app.js
10.	Start server - /src/index.js



# Notes
Q : What is Express.js?
A : Express.js is a fast, minimal, and flexible Node.js web framework used for building web applications and APIs. It simplifies routing, middleware integration, and request handling, making backend development efficient. (Main framework to building the server)
* Key Features of Express.js
- Routing System → Handles different HTTP methods (GET, POST, PUT, DELETE, etc.).
- Middleware Support → Process requests before sending responses (e.g., authentication, logging).
- Static File Serving → Serves HTML, CSS, JS, images using express.static().
- Template Engines → Supports EJS, Pug, Handlebars for rendering dynamic HTML.
- RESTful API Support → Makes building APIs easy with JSON responses.
- Database Integration → Works with MongoDB (Mongoose), MySQL, PostgreSQL, etc.
- Error Handling → Custom error-handling middleware for better debugging.
- Session & Cookies → Supports user sessions and authentication using express-session & cookie-parser.
- WebSockets Support → Works with socket.io for real-time communication.
- Cross-Origin Resource Sharing (CORS) → Allows cross-domain API access with cors middleware.
- Security Enhancements → Works with helmet & csrf for security.
- Scalability → Lightweight and optimized for large applications.


Q : What is JWT (JSON Web Token)?
A : JWT (JSON Web Token) is a secure way to transfer information between a client and a server as a digitally signed token. It is commonly used for authentication and authorization in web applications.
- The server does not store session data—everything is in the token.
- Tokens can be used in APIs & mobile apps easily.
- Secure & verifiable using cryptographic signing.


Q : What is CORS and Why Do We Need It?
A : CORS (Cross-Origin Resource Sharing) is a security feature enforced by web browsers to prevent unauthorized access to resources from different origins (domains). 
- It solves SOP(same-origin policy) problem.
- It helps us to allow a backend server to specify which origins are allowed to access its resources by adding special headers in the response.


