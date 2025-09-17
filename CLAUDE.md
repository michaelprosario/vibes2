Steven Smith, also known as Ardalis, emphasizes a few key rules for organizing code within the **Clean Architecture** paradigm. He prioritizes **separation of concerns** and **dependency inversion** to create a highly testable, maintainable, and flexible codebase.

***

### Key Rules

The core rules leveraged in this approach are:

* **Rule 1: Dependencies only flow inwards.** This is the most crucial rule. Inner circles (like **Core**) have no knowledge of outer circles (like **Infrastructure** or **Presentation**). The **Core** project doesn't know about databases, web frameworks, or UI technologies.
* **Rule 2: Don't depend on infrastructure.** The business logic within the **Core** project should be completely independent of any specific database, file system, or external service. This makes the core logic highly portable and easy to test.
* **Rule 3: Use interfaces to invert dependencies.** When an outer layer needs to communicate with an inner layer, it should do so through an **interface** defined in the inner layer. The outer layer then provides the concrete implementation of that interface. This is a classic application of the **Dependency Inversion Principle**.

***

### Code Organization

Code is organized into different projects, each representing a layer of the architecture. A typical structure looks like this:

* **Core:** The heart of the application, containing the business logic.
* **Infrastructure:** Deals with external concerns like databases, file systems, and external APIs.
* **Presentation:** The user-facing layer, such as a web API, a web application (like ASP.NET Core MVC), or a desktop application.
* **Tests:** Separate projects for unit and integration tests.

### The Core Library

The **Core** library is the central part of the application and contains the business logic. It should be framework-agnostic and technology-agnostic. Everything in this project is part of the application's core functionality. 

**What belongs in Core:**

* **Entities:** These are the business objects that represent the application's state. They are also known as domain models. For example, `Customer`, `Order`, `Product`.
* **Interfaces:** Interfaces for services that will be implemented in the Infrastructure or Presentation layers. For example, `ICustomerRepository`, `IEmailService`, `IFileService`. This allows the Core to define the contract without knowing the implementation.
* **Services:** Application-specific services that orchestrate the business logic. These services often use the interfaces defined within the Core.
* **Exceptions:** Custom exceptions specific to the business domain.
* **Enums and Value Objects:** Types that represent specific domain concepts.
* **Contracts/DTOs:** Data Transfer Objects (DTOs) used to pass data between the application and other layers.

### The Infrastructure Layer

The **Infrastructure** layer is where all the "plumbing" and external dependencies are managed. It is the outer layer that the **Core** knows nothing about.

**What belongs in Infrastructure:**

* **Database access code:** This includes ORMs (like Entity Framework Core), repositories, and database contexts. These classes implement the repository interfaces defined in the **Core** project.
* **File system interactions:** Code for reading from or writing to files.
* **External service integrations:** Clients for external APIs or third-party services. For example, an `EmailService` that sends emails using a specific provider.
* **Framework-specific code:** Any code that depends on a particular framework, such as ASP.NET Core's configuration or dependency injection setup.
* **Message queues or caching implementations.**

### The Presentation Layer

The **Presentation** layer is responsible for presenting the data to the user and receiving user input. It is the outermost layer of the architecture.

**What belongs in Presentation:**

* **User Interface (UI) components:** Views, controllers, pages (e.g., Razor Pages, Blazor components).
* **REST API endpoints:** Controllers that handle HTTP requests and responses.
* **View models or DTOs:** Data structures optimized for the UI.
* **Dependency injection setup:** The "startup" code that configures the application and binds interfaces to their concrete implementations.
* **Authentication and Authorization logic:** Code that handles user authentication and checks for permissions.

***

### Space for Unit Tests

Unit tests for the **Core** library should have their own dedicated project. This is crucial because **Core** is the most important part of the application to test and has no external dependencies. The unit tests for **Core** should not require a database connection, a file system, or any external service.

A separate project named something like `YourApp.Core.UnitTests` or `YourApp.Core.Tests` is ideal. These tests can be run quickly and in isolation, verifying the business logic and behavior of the **Core** project without needing to configure or mock any external infrastructure. Mocking frameworks can be used to simulate the behavior of the interfaces defined in the **Core** library.