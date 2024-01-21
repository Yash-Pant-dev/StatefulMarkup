const DashboardComponent = {
    name: 'Dashboard',
    template: `
    <div class="container-fluid h-100 justify-content-start rounded">
                            <div class="display-6 p-4 text-danger">Super Secret Dashboard</div>
                            <div class="lead fs-4 py-1">Welcome @Suffix</div>
                            <button class="btn btn-outline-success text-start fw-semibold fs-6">Launch Penguins into North Korea</button>
                        </div>
    `
}

StatefulMarkupClient.registerComponent(DashboardComponent)